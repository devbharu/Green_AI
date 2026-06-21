// electron/window-config/WindowConfig.ts

export type AlwaysOnTopLevel =
  | 'normal'
  | 'floating'
  | 'torn-off-menu'
  | 'modal-panel'
  | 'main-menu'
  | 'status'
  | 'pop-up-menu'
  | 'screen-saver';

export interface WindowVisibilityConfig {
  opacity: number;
  ignoreMouseEvents: boolean;
  skipTaskbar: boolean;
  alwaysOnTop: boolean;
  alwaysOnTopLevel: AlwaysOnTopLevel;
  visibleOnAllWorkspaces: boolean;
  visibleOnFullScreen: boolean;
  focusable: boolean;
  contentProtection: boolean;
}

export interface DarwinPlatformConfig {
  hiddenInMissionControl: boolean;
  windowButtonVisibility: boolean;
  backgroundColor: string;
  hasShadow: boolean;
}

export interface Win32PlatformConfig {
  thickFrame: boolean;
}

export interface PlatformSpecificConfig {
  darwin?: DarwinPlatformConfig;
  win32?: Win32PlatformConfig;
}

export interface WindowBehaviorConfig {
  showBehavior: WindowVisibilityConfig;
  hideBehavior: WindowVisibilityConfig;
  queueWithScreenshots: WindowVisibilityConfig;
  queueEmpty: WindowVisibilityConfig;
  settingsBehavior: WindowVisibilityConfig;
  platformSpecific: PlatformSpecificConfig;
}

export interface WindowBaseSettings {
  width: number;
  height: number;
  alwaysOnTop: boolean;
  show: boolean;
  fullscreenable: boolean;
  focusable: boolean;
  acceptFirstMouse?: boolean;
  enableLargerThanScreen: boolean;
  frame: boolean;
  hasShadow: boolean;
  transparent: boolean;
  skipTaskbar: boolean;
  titleBarStyle?: 'hidden' | 'default' | 'hiddenInset' | 'customButtonsOnHover';
  backgroundColor: string;
  type: string;
  paintWhenInitiallyHidden: boolean;
  movable: boolean;
  backgroundMaterial?: 'auto' | 'none' | 'mica' | 'acrylic' | 'tabbed';
}

export interface WindowConfig {
  baseSettings: WindowBaseSettings;
  behavior: WindowBehaviorConfig;
}

export type AppMode = 'live' | 'solution' | 'idle';
