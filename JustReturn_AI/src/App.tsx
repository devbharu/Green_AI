// src/App.tsx
import React, { useEffect, useRef, useCallback } from 'react';
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

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.classList.add(window.electronAPI.getPlatform());
  }, []);

  // ── Dimension Reporting ──────────────────────────────────────────────────────
  // Design principles (Electron best practices / Stack Overflow):
  //
  //   1. Break the feedback loop:
  //      ResizeObserver → reportDimensions → main calls setContentSize →
  //      Chromium relayouts → ResizeObserver fires AGAIN → infinite loop / shake.
  //      The suppressResize flag blocks callbacks for 300ms after we report.
  //
  //   2. Defer measurement to requestAnimationFrame:
  //      Avoids layout thrashing by reading dimensions only in the next paint
  //      cycle, after all DOM mutations have settled.
  //
  //   3. Skip no-op reports:
  //      If dimensions haven't changed, don't call reportDimensions at all.

  const lastW = useRef(0);
  const lastH = useRef(0);

  const reportDims = useCallback(() => {
    if (!rootRef.current) return;
    requestAnimationFrame(() => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);

      // Skip if nothing meaningful changed
      if (w === lastW.current && h === lastH.current) return;
      lastW.current = w;
      lastH.current = h;

      window.electronAPI.reportDimensions(w, h);
    });
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ro = new ResizeObserver(() => {
      reportDims();
    });

    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [reportDims]);

  return (
    <div ref={rootRef} className="overlay-root">
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
