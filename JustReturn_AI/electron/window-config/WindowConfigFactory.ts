// electron/window-config/WindowConfigFactory.ts
import { BrowserWindow } from 'electron';
import { WindowConfig, WindowVisibilityConfig, AppMode } from './WindowConfig';
import { LiveInterviewConfig } from './configs/LiveInterviewConfig';

export class WindowConfigFactory {
  private static instance: WindowConfigFactory;
  private lastAppliedConfig: WeakMap<BrowserWindow, WindowVisibilityConfig> = new WeakMap();

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
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    const lastConfig = this.lastAppliedConfig.get(window) || {} as Partial<WindowVisibilityConfig>;

    // Save bounds FIRST — some API calls shift the window
    const currentBounds = window.getBounds();
    let boundsNeedRestore = false;

    if (config.ignoreMouseEvents !== lastConfig.ignoreMouseEvents) {
      if (config.ignoreMouseEvents) {
        window.setIgnoreMouseEvents(true, { forward: true });
      } else {
        window.setIgnoreMouseEvents(false);
      }
    }

    // --- 1. FOCUS MANAGEMENT ---
    // On Windows, ALWAYS force focusable=false. There is no NSPanel equivalent —
    // focusable:true causes Chromium to call SetForegroundWindow() on any click/type,
    // which sends WM_KILLFOCUS to the user's active window (Chrome, proctored tests).
    // On macOS, NSPanel (type:'panel') handles non-activation natively, so focusable
    // can safely follow the config value to allow normal keyboard input to HTML elements.
    let effectiveFocusable = isWin ? false : config.focusable;
    if (effectiveFocusable !== lastConfig.focusable || !this.lastAppliedConfig.has(window)) {
      window.setFocusable(effectiveFocusable);
      boundsNeedRestore = true;
    }
    
    if (config.skipTaskbar !== lastConfig.skipTaskbar) {
      window.setSkipTaskbar(config.skipTaskbar);
      boundsNeedRestore = true;
    }

    // --- 2. MULTI-WORKSPACE & CROSS-PLATFORM LEVEL CONFIG ---
    if (isMac) {
      // macOS: native Spaces API — full workspace persistence + fullscreen overlay
      if (config.alwaysOnTop !== lastConfig.alwaysOnTop || config.alwaysOnTopLevel !== lastConfig.alwaysOnTopLevel) {
        window.setAlwaysOnTop(config.alwaysOnTop, config.alwaysOnTopLevel, 1);
        boundsNeedRestore = true;
      }
      if (config.visibleOnAllWorkspaces !== lastConfig.visibleOnAllWorkspaces || config.visibleOnFullScreen !== lastConfig.visibleOnFullScreen) {
        window.setVisibleOnAllWorkspaces(config.visibleOnAllWorkspaces, {
          visibleOnFullScreen: config.visibleOnFullScreen,
          skipTransformProcessType: true,
        });
      }
    } else if (isWin) {
      // Windows: setVisibleOnAllWorkspaces is a no-op — skip it entirely.
      // To overlay fullscreen apps/games, escalate to the 'screen-saver' level.
      if (config.alwaysOnTop !== lastConfig.alwaysOnTop || config.visibleOnFullScreen !== lastConfig.visibleOnFullScreen || config.alwaysOnTopLevel !== lastConfig.alwaysOnTopLevel) {
        if (config.alwaysOnTop) {
          const winLevel = config.visibleOnFullScreen
            ? 'screen-saver'
            : (config.alwaysOnTopLevel || 'floating');
          window.setAlwaysOnTop(true, winLevel as any, 1);
        } else {
          window.setAlwaysOnTop(false);
        }
        boundsNeedRestore = true;
      }
    } else {
      // Linux fallback
      if (config.alwaysOnTop !== lastConfig.alwaysOnTop || config.alwaysOnTopLevel !== lastConfig.alwaysOnTopLevel) {
        window.setAlwaysOnTop(config.alwaysOnTop, config.alwaysOnTopLevel, 1);
        boundsNeedRestore = true;
      }
    }

    if (config.contentProtection !== lastConfig.contentProtection) {
      window.setContentProtection(config.contentProtection);
    }
    
    if (config.opacity !== lastConfig.opacity) {
      window.setOpacity(config.opacity);
    }

    // Restore bounds — prevents drift from API calls
    if (boundsNeedRestore) {
      window.setBounds(currentBounds);
    }

    this.lastAppliedConfig.set(window, { ...config, focusable: effectiveFocusable });
  }

  public applyShowBehavior(window: BrowserWindow, mode: AppMode): void {
    const config = this.getConfig(mode);
    const effectiveConfig = { ...config.behavior.showBehavior };

    // Simply apply visibility config (opacity and mouse events).
    // The window remains persistent at the OS level, avoiding focus steals.
    this.applyVisibilityConfig(window, effectiveConfig);
  }

  // Apply show-behavior visibility config WITHOUT calling showSafe().
  // Use this when the window is already visible (e.g. switching views via notify-view-change).
  // Calling showSafe() on an already-visible window causes a redundant DWM paint cycle on Windows.
  public applyVisibilityForView(window: BrowserWindow, mode: AppMode): void {
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
    this.applyVisibilityConfig(window, { ...config.behavior.settingsBehavior, isSettings: true } as any);
  }
}
