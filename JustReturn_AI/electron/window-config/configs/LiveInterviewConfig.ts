// electron/window-config/configs/LiveInterviewConfig.ts
import { WindowConfig } from '../WindowConfig';

export const LiveInterviewConfig: WindowConfig = {
  baseSettings: {
    width: 700,
    height: 500,
    alwaysOnTop: true,
    show: false,
    fullscreenable: false,
    focusable: false,
    acceptFirstMouse: false,
    enableLargerThanScreen: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    transparent: true,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    // NOTE: `type` is NOT set here — it is injected per-platform in createWindow():
    //   macOS → 'panel'   (NSWindowStyleMaskNonactivatingPanel, no focus steal)
    //   Windows → 'toolbar' (WS_EX_TOOLWINDOW, excluded from Alt+Tab)
    paintWhenInitiallyHidden: true,
    movable: true,
    // backgroundMaterial removed — 'acrylic' conflicts with WDA_EXCLUDEFROMCAPTURE on Windows
  },
  behavior: {
    // --- SHOW: overlay visible and scrollable ---
    showBehavior: {
      opacity: 1,
      ignoreMouseEvents: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      alwaysOnTopLevel: 'screen-saver',
      visibleOnAllWorkspaces: true,
      visibleOnFullScreen: true,
      // Windows: factory always enforces focusable=false via effectiveFocusable; this value only applies on macOS
      focusable: true,
      contentProtection: true,
    },

    // --- HIDE: completely invisible and pass-through ---
    hideBehavior: {
      opacity: 0,
      ignoreMouseEvents: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      alwaysOnTopLevel: 'screen-saver',
      visibleOnAllWorkspaces: true,
      visibleOnFullScreen: true,
      focusable: false,
      contentProtection: true,
    },

    // --- QUEUE: invisible to screen sharing but intercepts clicks ---
    queueWithScreenshots: {
      opacity: 1,
      ignoreMouseEvents: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      alwaysOnTopLevel: 'screen-saver',
      visibleOnAllWorkspaces: true,
      visibleOnFullScreen: true,
      focusable: false,
      contentProtection: true,
    },

    // --- QUEUE EMPTY: minimal visible state ---
    queueEmpty: {
      opacity: 0.8,
      ignoreMouseEvents: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      alwaysOnTopLevel: 'screen-saver',
      visibleOnAllWorkspaces: true,
      visibleOnFullScreen: true,
      focusable: false,
      contentProtection: true,
    },

    // --- SETTINGS: interactive ---
    settingsBehavior: {
      opacity: 1,
      ignoreMouseEvents: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      alwaysOnTopLevel: 'screen-saver',
      visibleOnAllWorkspaces: true,
      visibleOnFullScreen: true,
      // Windows: factory always enforces focusable=false via effectiveFocusable; this value only applies on macOS
      focusable: true,
      contentProtection: true,
    },

    // --- PLATFORM-SPECIFIC ---
    platformSpecific: {
      darwin: {
        hiddenInMissionControl: true,  // hide from cmd+tab expose view
        windowButtonVisibility: false,
        backgroundColor: '#00000000',
        hasShadow: false,
      },
      win32: {
        thickFrame: false,
      },
    },
  },
};
