// electron/window-config/configs/LiveInterviewConfig.ts
import { WindowConfig } from '../WindowConfig';

export const LiveInterviewConfig: WindowConfig = {
  baseSettings: {
    width: 700,
    height: 500,
    alwaysOnTop: true,
    show: true,
    fullscreenable: false,
    focusable: false,
    acceptFirstMouse: false,
    enableLargerThanScreen: true,
    frame: false,
    hasShadow: false,
    transparent: true,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    type: 'panel',
    paintWhenInitiallyHidden: true,
    movable: true,
    backgroundMaterial: 'acrylic', // Native Windows 11 glassy blur
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
      focusable: false,
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
        thickFrame: false,             // no resize handles
      },
    },
  },
};
