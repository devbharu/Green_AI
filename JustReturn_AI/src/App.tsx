// src/App.tsx
import React, { useEffect, useRef } from 'react';
import { useOverlay } from './hooks/useOverlay';
import { ScreenshotQueue } from './components/ScreenshotQueue';
import { SolutionPanel } from './components/SolutionPanel';
import { SettingsPanel } from './components/SettingsPanel';
import './App.css';

export default function App() {
  const {
    view,
    screenshots, solution,
    isProcessing, error,
    apiKey, model, systemPrompt,
    saveApiKey, saveModel, saveSystemPrompt,
  } = useOverlay();

  // Report rendered size to main process so it can resize the Electron window
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        if (!rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        window.electronAPI.reportDimensions(Math.ceil(rect.width), Math.ceil(rect.height));
      }
    });
    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="overlay-root" onMouseDown={(e) => e.preventDefault()}>
      {/* Single panel-glass wrapper — only one view shown at a time */}
      <div className="panel-glass">
        {view === 'queue' && (
          <div className="view-enter">
            <ScreenshotQueue
              screenshots={screenshots}
              isProcessing={isProcessing}
            />
          </div>
        )}
        {view === 'solution' && (
          <div className="view-enter">
            <SolutionPanel
              solution={solution}
              isProcessing={isProcessing}
              error={error}
            />
          </div>
        )}
        {view === 'settings' && (
          <div className="view-enter">
            <SettingsPanel
              apiKey={apiKey}
              model={model}
              systemPrompt={systemPrompt}
              onSaveApiKey={saveApiKey}
              onSaveModel={saveModel}
              onSaveSystemPrompt={saveSystemPrompt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
