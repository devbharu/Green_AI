// electron/window-config/WindowConfigFactory.ts
import { BrowserWindow } from 'electron';
import { WindowConfig, WindowVisibilityConfig, AppMode } from './WindowConfig';
import { LiveInterviewConfig } from './configs/LiveInterviewConfig';

export class WindowConfigFactory {
  private static instance: WindowConfigFactory;

  private constructor() {}

  public static getInstance(): WindowConfigFactory {
    if (!WindowConfigFactory.instance) {
      WindowConfigFactory.instance = new WindowConfigFactory();
    }
    return WindowConfigFactory.instance;
  }

  public getConfig(mode: AppMode): WindowConfig {
    // All modes use LiveInterviewConfig — extend here for other configs
    return LiveInterviewConfig;
  }

  // -----------------------------------------------------------------
  // Core: apply a visibility config atomically with bounds preservation
  // -----------------------------------------------------------------
  public applyVisibilityConfig(
    window: BrowserWindow,
    config: WindowVisibilityConfig,
  ): void {
    // Save bounds FIRST — some API calls shift the window
    const currentBounds = window.getBounds();

    if (config.ignoreMouseEvents) {
      window.setIgnoreMouseEvents(true, { forward: true });
    } else {
      window.setIgnoreMouseEvents(false);
    }

    window.setFocusable(config.focusable);
    window.setSkipTaskbar(config.skipTaskbar);
    window.setAlwaysOnTop(config.alwaysOnTop, config.alwaysOnTopLevel, 1);
    window.setVisibleOnAllWorkspaces(config.visibleOnAllWorkspaces, {
      visibleOnFullScreen: config.visibleOnFullScreen,
      skipTransformProcessType: true
    });
    window.setContentProtection(config.contentProtection);
    window.setOpacity(config.opacity);

    // Restore bounds — prevents drift from API calls
    window.setBounds(currentBounds);
  }

  public applyShowBehavior(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    this.applyVisibilityConfig(window, config.behavior.showBehavior);
  }

  public applyHideBehavior(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    this.applyVisibilityConfig(window, config.behavior.hideBehavior);
  }

  public applyQueueWithScreenshots(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    this.applyVisibilityConfig(window, config.behavior.queueWithScreenshots);
  }

  public applyQueueEmpty(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    this.applyVisibilityConfig(window, config.behavior.queueEmpty);
  }

  public applySettingsBehavior(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    this.applyVisibilityConfig(window, config.behavior.settingsBehavior);
  }
}
