// src/types/electron.d.ts

export interface ElectronAPI {
  toggleWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  takeScreenshot: () => Promise<{ path: string; preview: string }>;
  getScreenshotQueue: () => Promise<string[]>;
  clearQueue: () => Promise<boolean>;
  processScreenshots: (apiKey: string, model: string) => Promise<void>;
  cancelProcessing: () => Promise<void>;
  moveWindow: (dir: 'left' | 'right' | 'up' | 'down') => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string>;
  setModel: (model: string) => Promise<void>;
  getModel: () => Promise<string>;
  setSystemPrompt: (prompt: string) => Promise<void>;
  getSystemPrompt: () => Promise<string>;
  copyToClipboard: (text: string) => Promise<void>;
  onScreenshotTaken: (cb: (data: { path: string; preview: string }) => void) => () => void;
  onAiResponse: (cb: (chunk: string) => void) => () => void;
  onAiDone: (cb: () => void) => () => void;
  onAiError: (cb: (err: string) => void) => () => void;
  onProcessingStarted: (cb: () => void) => () => void;
  onSetView: (cb: (view: string) => void) => () => void;
  onResetView: (cb: () => void) => () => void;
  onToggleSettings: (cb: () => void) => () => void;
  onWindowDimensionsRequest: (cb: (dims: { width: number; height: number }) => void) => () => void;
  reportDimensions: (width: number, height: number) => void;
  notifyViewChange: (view: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
