// electron/main.ts
import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  desktopCapturer,
  nativeImage,
  clipboard,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { WindowConfigFactory } from './window-config/WindowConfigFactory';
import { ShortcutsHelper } from './shortcuts';
import { AppMode } from './window-config/WindowConfig';
import { LiveInterviewConfig } from './window-config/configs/LiveInterviewConfig';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  mainWindow: BrowserWindow | null;
  isWindowVisible: boolean;
  currentX: number;
  currentY: number;
  screenHeight: number;
  windowSize: { width: number; height: number } | null;
  windowPosition: { x: number; y: number } | null;
  appMode: AppMode;
  screenshotQueue: string[];   // paths to captured screenshots
  isProcessing: boolean;
  apiKey: string;
  model: string;
  systemPrompt: string;
  shortcutsHelper: ShortcutsHelper | null;
  abortController: AbortController | null;
}

const state: AppState = {
  mainWindow: null,
  isWindowVisible: false,
  currentX: 50,
  currentY: 50,
  screenHeight: 0,
  windowSize: null,
  windowPosition: null,
  appMode: 'idle',
  screenshotQueue: [],
  isProcessing: false,
  apiKey: '',
  model: 'gemma4:31b-cloud',
  systemPrompt: 'You are an elite coding assistant. You MUST format your response exactly like this:\n\n```[language]\n<your complete code here>\n```\n\nExplanation:\n<your explanation here>\n\nDo NOT write any text before the first code block.',
  shortcutsHelper: null,
  abortController: null,
};

const STEP = 60; // pixels per arrow-key move

const isDev = process.env.NODE_ENV === 'development';

// ─── Screenshot helpers ───────────────────────────────────────────────────────

async function takeScreenshot(): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  const primary = sources[0];
  const img = primary.thumbnail;
  const timestamp = Date.now();
  const screenshotDir = path.join(app.getPath('userData'), 'screenshots');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
  fs.writeFileSync(filePath, img.toPNG());
  state.screenshotQueue.push(filePath);
  return filePath;
}

async function getImagePreview(filePath: string): Promise<string> {
  const img = nativeImage.createFromPath(filePath);
  const resized = img.resize({ width: 300 });
  return resized.toDataURL();
}

// ─── AI Processing (Ollama local) ─────────────────────────────────────────────

const MODELS = [
  { value: 'gemma4:31b-cloud',       vision: true },
  { value: 'gpt-oss:120b-cloud',     vision: false },
  { value: 'qwen3-coder:480b-cloud', vision: false },
  { value: 'gpt-oss:20b-cloud',      vision: false },
  { value: 'minimax-m3:cloud',       vision: true },
  { value: 'nemotron-3-super:cloud', vision: false },
];

function isVisionModel(modelName: string): boolean {
  const model = MODELS.find(m => m.value === modelName);
  return model ? model.vision : false;
}

async function extractTextFromImages(imagePaths: string[]): Promise<string> {
  if (imagePaths.length > 1) {
    state.mainWindow?.webContents.send('ai-response-chunk', `\n*Running OCR on ${imagePaths.length} screenshots in parallel...*\n`);
  } else {
    state.mainWindow?.webContents.send('ai-response-chunk', `\n*Running OCR on screenshot...*\n`);
  }

  // Lazy load heavy tesseract.js dependency to avoid blocking app boot
  const { createWorker } = await import('tesseract.js');

  // Spin up 1 worker per screenshot to process them all simultaneously
  const promises = imagePaths.map(async (imgPath, i) => {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imgPath);
    await worker.terminate();
    return `\n--- Screenshot ${i + 1} ---\n${text}\n`;
  });

  const results = await Promise.all(promises);
  return results.join('');
}

async function processScreenshots(): Promise<void> {
  if (state.screenshotQueue.length === 0 || state.isProcessing) return;

  state.isProcessing = true;
  state.abortController = new AbortController();

  // Tell renderer to switch to solution view with "Thinking..." state
  state.mainWindow?.webContents.send('processing-started');

  try {
    let images: string[] | undefined = undefined;
    let textContent = 'Solve the problem in these images. Provide ONLY the solution code block followed by an "Explanation:" section.';

    if (isVisionModel(state.model)) {
      // Build base64 images array for Ollama
      images = state.screenshotQueue.map((imgPath) => {
        const data = fs.readFileSync(imgPath);
        return data.toString('base64');
      });
    } else {
      const extractedText = await extractTextFromImages(state.screenshotQueue);
      textContent = `Solve the problem shown in the following extracted text from screenshots:\n\n${extractedText}\n\nYou MUST start your response immediately with the markdown code block containing the solution. Put your explanation AFTER the code block.`;
    }

    const payload: any = {
      model: state.model,
      messages: [],
      stream: true,
    };

    if (state.systemPrompt.trim()) {
      payload.messages.push({
        role: 'system',
        content: state.systemPrompt,
      });
    }

    payload.messages.push({
      role: 'user',
      content: textContent,
    });

    if (images) {
      payload.messages[payload.messages.length - 1].images = images;
    }

    const body = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    await new Promise<void>((resolve, reject) => {
      const req = http.request(options, (res) => {
        let buffer = '';
        let doneReceived = false;

        // --- IPC BATCHING SETUP ---
        let ipcBatchBuffer = '';
        let ipcBatchTimeout: NodeJS.Timeout | null = null;
        
        const flushIpcBatch = () => {
          if (ipcBatchBuffer) {
            state.mainWindow?.webContents.send('ai-response-chunk', ipcBatchBuffer);
            ipcBatchBuffer = '';
          }
          ipcBatchTimeout = null;
        };

        const queueIpcChunk = (chunk: string) => {
          ipcBatchBuffer += chunk;
          if (!ipcBatchTimeout) {
            ipcBatchTimeout = setTimeout(flushIpcBatch, 30);
          }
        };
        // --------------------------

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          if (res.statusCode !== 200) {
            return; // accumulate error response in buffer
          }

          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                queueIpcChunk(parsed.message.content);
              }
              if (parsed.done && !doneReceived) {
                doneReceived = true;
                flushIpcBatch();
                state.mainWindow?.webContents.send('ai-response-done');
              }
            } catch {
              // ignore parse errors on partial lines
            }
          }
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            try {
              const parsedError = JSON.parse(buffer);
              reject(new Error(parsedError.error || parsedError.message || `Server returned status ${res.statusCode}`));
            } catch {
              reject(new Error(`Server returned status ${res.statusCode}: ${buffer}`));
            }
            return;
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.message?.content) {
                queueIpcChunk(parsed.message.content);
              }
              if (parsed.done && !doneReceived) {
                doneReceived = true;
              }
            } catch { /* ignore */ }
          }
          
          // Flush any pending IPC batches
          flushIpcBatch();
          
          // Only send done if Ollama didn't send it via the stream
          if (!doneReceived) {
            state.mainWindow?.webContents.send('ai-response-done');
          }
          resolve();
        });

        res.on('error', reject);
      });

      req.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED') {
          reject(new Error("Could not connect to Ollama. Please ensure the Ollama app is running on your machine."));
        } else {
          reject(new Error(`Failed to communicate with Ollama: ${err.message}`));
        }
      });
      req.write(body);
      req.end();
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.mainWindow?.webContents.send('ai-response-error', msg);
  } finally {
    state.isProcessing = false;
    state.abortController = null;
  }
}

// ─── Window Bounds ────────────────────────────────────────────────────────────

function isWindowCompletelyOffScreen(x: number, y: number, w: number, h: number): boolean {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return x + w < 0 || y + h < 0 || x > width || y > height;
}

function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

  const [currentX, currentY] = state.mainWindow.getPosition();
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const maxWidth = Math.floor(workArea.width * 0.55);

  const newWidth = Math.min(width + 32, maxWidth);
  const newHeight = Math.ceil(height) + 8; // +8 so bottom shadow/radius isn't clipped

  let adjustedX = currentX;
  let adjustedY = currentY;

  if (isWindowCompletelyOffScreen(currentX, currentY, newWidth, newHeight)) {
    adjustedX = Math.max(0, (workArea.width - newWidth) / 2);
    adjustedY = Math.max(0, (workArea.height - newHeight) / 2);
  }

  state.mainWindow.setBounds({ x: adjustedX, y: adjustedY, width: newWidth, height: newHeight });
  state.currentX = adjustedX;
  state.currentY = adjustedY;
  state.windowPosition = { x: adjustedX, y: adjustedY };
  state.windowSize = { width: newWidth, height: newHeight };
}

// ─── Window Show/Hide ─────────────────────────────────────────────────────────

function showMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    if (state.windowPosition && state.windowSize) {
      state.mainWindow!.setBounds({ ...state.windowPosition, ...state.windowSize });
    }

    const configFactory = WindowConfigFactory.getInstance();

    // Flash-free show: set opacity 0, showInactive (no focus steal), then restore
    state.mainWindow!.setOpacity(0);
    
    // Default to prohibited on show (renderer will update if settings is open)
    if (process.platform === 'darwin') {
      app.setActivationPolicy('prohibited');
    }
    
    state.mainWindow!.showInactive();               // ← NO focus steal
    configFactory.applyShowBehavior(state.mainWindow!, state.appMode);

    // FOCUS BYPASS: ensure the window stays non-focusable after showing.
    // Even though showInactive() doesn't focus, some OS events can still
    // trigger a focus gain. Belt-and-suspenders.
    state.mainWindow!.setFocusable(false);

    state.isWindowVisible = true;
    state.shortcutsHelper?.registerAllShortcuts();
  }
}

function hideMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    const configFactory = WindowConfigFactory.getInstance();
    configFactory.applyHideBehavior(state.mainWindow!, state.appMode);

    state.isWindowVisible = false;
    state.shortcutsHelper?.registerVisibilityShortcutOnly();
  }
}

// Debounced toggle — prevents rapid toggle getting window into bad state
let isToggling = false;
function toggleMainWindow(): void {
  if (isToggling) return;
  isToggling = true;

  if (state.isWindowVisible) {
    hideMainWindow();
  } else {
    showMainWindow();
  }

  setTimeout(() => { isToggling = false; }, 300);
}

// ─── Window Movement ──────────────────────────────────────────────────────────

function moveWindowHorizontal(updateFn: (x: number) => number): void {
  if (!state.mainWindow) return;
  state.currentX = updateFn(state.currentX);
  state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
}

function moveWindowVertical(updateFn: (y: number) => number): void {
  if (!state.mainWindow || !state.windowSize) return;

  const newY = updateFn(state.currentY);
  // Allow window to go 2/3 off screen in either direction (blog technique)
  const maxUpLimit = (-(state.windowSize.height || 0) * 2) / 3;
  const maxDownLimit = state.screenHeight + ((state.windowSize.height || 0) * 2) / 3;

  if (newY >= maxUpLimit && newY <= maxDownLimit) {
    state.currentY = newY;
    state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
  }
}

// ─── Platform config preservation on focus ───────────────────────────────────

function handleWindowFocus(): void {
  preserveWindowConfiguration();
}

function preserveWindowConfiguration(): void {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) {
    return;
  }

  const windowConfig = WindowConfigFactory.getInstance().getConfig(
    state.appMode,
  );
  const platformConfig = windowConfig.behavior.platformSpecific;

  if (process.platform === 'darwin' && platformConfig.darwin) {
    state.mainWindow.setWindowButtonVisibility(
      platformConfig.darwin.windowButtonVisibility,
    );
    state.mainWindow.setHiddenInMissionControl(
      platformConfig.darwin.hiddenInMissionControl,
    );
    state.mainWindow.setBackgroundColor(platformConfig.darwin.backgroundColor);
    state.mainWindow.setHasShadow(platformConfig.darwin.hasShadow);
  }

  if (process.platform === 'win32' && platformConfig.win32) {
    state.mainWindow.setMenuBarVisibility(false);
    state.mainWindow.setAutoHideMenuBar(true);
  }
}

// ─── Create Window ────────────────────────────────────────────────────────────

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  state.screenHeight = height;

  const windowConfig = LiveInterviewConfig;
  const platformConfig = windowConfig.behavior.platformSpecific;

  // Win32-specific: disable thick frame (resize handles)
  const windowsSpecificOptions =
    process.platform === 'win32' && platformConfig.win32
      ? { thickFrame: platformConfig.win32.thickFrame }
      : {};

  const baseSettings = windowConfig.baseSettings;

  state.mainWindow = new BrowserWindow({
    ...baseSettings,
    ...windowsSpecificOptions,
    x: state.currentX,
    y: 50,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      scrollBounce: true,
    },
  });

  // ── THE THREE CORE INVISIBILITY CALLS (from blog) ──────────────────────────
  //   1. setContentProtection → WDA_EXCLUDEFROMCAPTURE (Win) / NSWindowSharingNone (Mac)
  //   2. setVisibleOnAllWorkspaces → persist across virtual desktops + full-screen
  //   3. setAlwaysOnTop 'screen-saver' → highest level, above full-screen apps
  state.mainWindow.setContentProtection(true);
  state.mainWindow.setVisibleOnAllWorkspaces(true, { 
    visibleOnFullScreen: true,
    skipTransformProcessType: true
  });
  state.mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  // macOS: hide from Mission Control, remove shadow
  if (process.platform === 'darwin' && platformConfig.darwin) {
    state.mainWindow.setHiddenInMissionControl(platformConfig.darwin.hiddenInMissionControl);
    state.mainWindow.setHasShadow(platformConfig.darwin.hasShadow);
    state.mainWindow.setWindowButtonVisibility(platformConfig.darwin.windowButtonVisibility);
  }

  state.mainWindow.on('focus', handleWindowFocus);

  state.windowSize = { width: baseSettings.width, height: baseSettings.height };
  state.windowPosition = { x: state.currentX, y: 50 };

  // Load app
  if (isDev) {
    void state.mainWindow.loadURL('http://localhost:5173');
    // state.mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void state.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Setup shortcuts helper
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow: () => state.mainWindow,
    takeScreenshot,
    getImagePreview,
    toggleMainWindow,
    processScreenshots,
    cancelOngoingRequests: () => {
      state.abortController?.abort();
      state.isProcessing = false;
    },
    clearQueues: () => {
      state.screenshotQueue = [];
    },
    setView: (view) => {
      state.mainWindow?.webContents.send('set-view', view);
    },
    toggleSettings: () => {
      state.mainWindow?.webContents.send('toggle-settings');
    },
    moveWindowLeft: () => moveWindowHorizontal((x) => x - STEP),
    moveWindowRight: () => moveWindowHorizontal((x) => x + STEP),
    moveWindowUp: () => moveWindowVertical((y) => y - STEP),
    moveWindowDown: () => moveWindowVertical((y) => y + STEP),
    quitApp: () => app.quit(),
  });

  // Start hidden — show on first toggle
  hideMainWindow();
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle('toggle-window', () => toggleMainWindow());
  ipcMain.handle('show-window', () => showMainWindow());
  ipcMain.handle('hide-window', () => hideMainWindow());

  ipcMain.handle('take-screenshot', async () => {
    const p = await takeScreenshot();
    const preview = await getImagePreview(p);
    return { path: p, preview };
  });

  ipcMain.handle('get-screenshot-queue', () => state.screenshotQueue);

  ipcMain.handle('clear-queue', () => {
    state.screenshotQueue = [];
    return true;
  });

  ipcMain.handle('process-screenshots', async () => {
    await processScreenshots();
  });

  ipcMain.handle('cancel-processing', () => {
    state.abortController?.abort();
    state.isProcessing = false;
  });

  ipcMain.handle('move-window', (_e, dir: 'left' | 'right' | 'up' | 'down') => {
    switch (dir) {
      case 'left':  moveWindowHorizontal((x) => x - STEP); break;
      case 'right': moveWindowHorizontal((x) => x + STEP); break;
      case 'up':    moveWindowVertical((y) => y - STEP);   break;
    }
  });

  ipcMain.handle('set-api-key', (_e, key: string) => { state.apiKey = key; });
  ipcMain.handle('get-api-key', () => state.apiKey);
  ipcMain.handle('set-model', (_e, model: string) => { state.model = model; });
  ipcMain.handle('get-model', () => state.model);
  ipcMain.handle('set-system-prompt', (_e, prompt: string) => { state.systemPrompt = prompt; });
  ipcMain.handle('get-system-prompt', () => state.systemPrompt);
  
  ipcMain.handle('copy-to-clipboard', (_e, text: string) => {
    clipboard.writeText(text);
  });
  // Renderer reports its own dimensions → main resizes window
  ipcMain.on('report-dimensions', (_e, { width, height }: { width: number; height: number }) => {
    setWindowDimensions(width, height);
  });

  // Renderer reports view change, we update visibility config dynamically
  ipcMain.on('notify-view-change', (_e, view: string) => {
    if (!state.mainWindow || state.mainWindow.isDestroyed() || !state.isWindowVisible) return;
    const configFactory = WindowConfigFactory.getInstance();
    
    if (view === 'settings') {
      configFactory.applySettingsBehavior(state.mainWindow, state.appMode);
    } else if (view === 'solution') {
      configFactory.applyShowBehavior(state.mainWindow, state.appMode);
    } else if (view === 'queue') {
      if (state.screenshotQueue.length > 0) {
        configFactory.applyQueueWithScreenshots(state.mainWindow, state.appMode);
      } else {
        configFactory.applyQueueEmpty(state.mainWindow, state.appMode);
      }
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }
  // Make app an accessory so it doesn't show in dock but allows window creation
  if (process.platform === 'darwin') {
    app.setActivationPolicy('accessory');
  }
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
