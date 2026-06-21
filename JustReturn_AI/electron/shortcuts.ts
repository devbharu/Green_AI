// electron/shortcuts.ts
import { globalShortcut } from 'electron';

export interface ShortcutDeps {
  getMainWindow: () => Electron.BrowserWindow | null;
  takeScreenshot: () => Promise<string>;
  getImagePreview: (path: string) => Promise<string>;
  toggleMainWindow: () => void;
  processScreenshots: () => Promise<void>;
  cancelOngoingRequests: () => void;
  clearQueues: () => void;
  setView: (view: string) => void;
  toggleSettings: () => void;
  moveWindowLeft: () => void;
  moveWindowRight: () => void;
  moveWindowUp: () => void;
  moveWindowDown: () => void;
  quitApp: () => void;
}

export class ShortcutsHelper {
  constructor(private deps: ShortcutDeps) {}

  // Register ALL shortcuts (when overlay is visible)
  // Since the overlay is always click-through, ALL interaction is via shortcuts.
  public registerAllShortcuts(): void {
    globalShortcut.unregisterAll();

    // Cmd+H — take screenshot and queue it
    globalShortcut.register('CommandOrControl+H', () => {
      void (async () => {
        const mainWindow = this.deps.getMainWindow();
        if (mainWindow) {
          const screenshotPath = await this.deps.takeScreenshot();
          const preview = await this.deps.getImagePreview(screenshotPath);
          mainWindow.webContents.send('screenshot-taken', {
            path: screenshotPath,
            preview,
          });
        }
      })();
    });

    // Cmd+Enter — process queued screenshots with AI
    globalShortcut.register('CommandOrControl+Return', () => {
      void this.deps.processScreenshots();
    });

    // Cmd+G — clear queue and reset view
    globalShortcut.register('CommandOrControl+G', () => {
      this.deps.cancelOngoingRequests();
      this.deps.clearQueues();
      this.deps.setView('queue');
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reset-view');
      }
    });

    // Cmd+; — toggle settings panel
    globalShortcut.register('CommandOrControl+;', () => {
      this.deps.toggleSettings();
    });

    // Arrow keys — move overlay
    globalShortcut.register('CommandOrControl+Left', () => this.deps.moveWindowLeft());
    globalShortcut.register('CommandOrControl+Right', () => this.deps.moveWindowRight());
    globalShortcut.register('CommandOrControl+Down', () => this.deps.moveWindowDown());
    globalShortcut.register('CommandOrControl+Up', () => this.deps.moveWindowUp());

    // Cmd+B — toggle show/hide
    globalShortcut.register('CommandOrControl+B', () => {
      this.deps.toggleMainWindow();
    });

    // Cmd+Q — kill app
    globalShortcut.register('CommandOrControl+Q', () => {
      this.deps.quitApp();
    });
  }

  // Only keep toggle shortcut when overlay is hidden
  public registerVisibilityShortcutOnly(): void {
    globalShortcut.unregisterAll();

    // 500ms delay prevents race condition on rapid re-register
    setTimeout(() => {
      globalShortcut.register('CommandOrControl+B', () => {
        this.deps.toggleMainWindow();
      });

      // Maintain kill shortcut even when hidden
      globalShortcut.register('CommandOrControl+Q', () => {
        this.deps.quitApp();
      });
    }, 500);
  }

  public unregisterAll(): void {
    globalShortcut.unregisterAll();
  }
}
