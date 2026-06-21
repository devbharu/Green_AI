// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC APIs to renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  // Window control
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),

  // Screenshot
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  getScreenshotQueue: () => ipcRenderer.invoke('get-screenshot-queue'),
  clearQueue: () => ipcRenderer.invoke('clear-queue'),

  // AI processing
  processScreenshots: (apiKey: string, model: string) =>
    ipcRenderer.invoke('process-screenshots', { apiKey, model }),
  cancelProcessing: () => ipcRenderer.invoke('cancel-processing'),

  // Window movement
  moveWindow: (dir: 'left' | 'right' | 'up' | 'down') =>
    ipcRenderer.invoke('move-window', dir),

  // Settings
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setModel: (model: string) => ipcRenderer.invoke('set-model', model),
  getModel: () => ipcRenderer.invoke('get-model'),
  setSystemPrompt: (prompt: string) => ipcRenderer.invoke('set-system-prompt', prompt),
  getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),
  
  // Utilities
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

  // Listeners (renderer subscribes to main process events)
  onScreenshotTaken: (cb: (data: { path: string; preview: string }) => void) => {
    ipcRenderer.removeAllListeners('screenshot-taken');
    ipcRenderer.on('screenshot-taken', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('screenshot-taken');
  },
  onAiResponse: (cb: (chunk: string) => void) => {
    ipcRenderer.removeAllListeners('ai-response-chunk');
    ipcRenderer.on('ai-response-chunk', (_e, chunk) => cb(chunk));
    return () => ipcRenderer.removeAllListeners('ai-response-chunk');
  },
  onAiDone: (cb: () => void) => {
    ipcRenderer.removeAllListeners('ai-response-done');
    ipcRenderer.on('ai-response-done', () => cb());
    return () => ipcRenderer.removeAllListeners('ai-response-done');
  },
  onAiError: (cb: (err: string) => void) => {
    ipcRenderer.removeAllListeners('ai-response-error');
    ipcRenderer.on('ai-response-error', (_e, err) => cb(err));
    return () => ipcRenderer.removeAllListeners('ai-response-error');
  },
  onProcessingStarted: (cb: () => void) => {
    ipcRenderer.removeAllListeners('processing-started');
    ipcRenderer.on('processing-started', () => cb());
    return () => ipcRenderer.removeAllListeners('processing-started');
  },
  onSetView: (cb: (view: string) => void) => {
    ipcRenderer.removeAllListeners('set-view');
    ipcRenderer.on('set-view', (_e, view) => cb(view));
    return () => ipcRenderer.removeAllListeners('set-view');
  },
  onResetView: (cb: () => void) => {
    ipcRenderer.removeAllListeners('reset-view');
    ipcRenderer.on('reset-view', () => cb());
    return () => ipcRenderer.removeAllListeners('reset-view');
  },
  onToggleSettings: (cb: () => void) => {
    ipcRenderer.removeAllListeners('toggle-settings');
    ipcRenderer.on('toggle-settings', () => cb());
    return () => ipcRenderer.removeAllListeners('toggle-settings');
  },
  onWindowDimensionsRequest: (cb: (dims: { width: number; height: number }) => void) => {
    ipcRenderer.removeAllListeners('request-dimensions');
    ipcRenderer.on('request-dimensions', (_e, dims) => cb(dims));
    return () => ipcRenderer.removeAllListeners('request-dimensions');
  },

  // Send dimensions from renderer → main
  reportDimensions: (width: number, height: number) =>
    ipcRenderer.send('report-dimensions', { width, height }),

  notifyViewChange: (view: string) =>
    ipcRenderer.send('notify-view-change', view),
});
