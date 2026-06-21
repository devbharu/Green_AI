// src/components/ScreenshotQueue.tsx
import React from 'react';
import { Screenshot } from '../hooks/useOverlay';

interface Props {
  screenshots: Screenshot[];
  isProcessing: boolean;
}

const HEADER_SHORTCUTS = [
  { label: 'Show/Hide', keys: ['Ctrl/Cmd', 'B'] },
  { label: 'Screenshot', keys: ['Ctrl/Cmd', 'H'] },
  { label: 'Clear', keys: ['Ctrl/Cmd', 'G'] },
];

// Memoized individual screenshot item to prevent unnecessary re-renders of the whole grid
const ScreenshotItem = React.memo(({ s, index }: { s: Screenshot; index: number }) => (
  <div className="sq-thumb">
    <img src={s.preview} alt={`Screenshot ${index + 1}`} />
    <span className="sq-thumb-index">{index + 1}</span>
  </div>
));

export const ScreenshotQueue = React.memo(function ScreenshotQueue({ screenshots, isProcessing }: Props) {
  const hasScreenshots = screenshots.length > 0;

  return (
    <div className="sq-root" onMouseDown={(e) => e.preventDefault()}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={`sq-header ${hasScreenshots ? 'sq-header--bordered' : ''}`}>
        <div className="sq-title-group">
          <span className="sq-title">Green AI</span>
        </div>
        <div className="sq-shortcuts-row">
          {HEADER_SHORTCUTS.map((s) => (
            <div key={s.label} className="sq-shortcut-item">
              <span className="sq-shortcut-label">{s.label}</span>
              <div className="sq-kbd-group">
                {s.keys.map((k) => <kbd key={k}>{k}</kbd>)}
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* ── Screenshot Grid ─────────────────────────────────────── */}
      {hasScreenshots && (
        <div className="sq-body">
          <div className="sq-grid">
            {screenshots.map((s, i) => (
              <ScreenshotItem key={s.path} s={s} index={i} />
            ))}
          </div>

          <div className="sq-footer">
            {isProcessing ? (
              <div className="sq-status">
                <span className="pulse-dot pulse-dot--accent" />
                <span>Solving...</span>
              </div>
            ) : (
              <>
                <div className="sq-action">
                  <kbd>Ctrl/Cmd</kbd>
                  <span className="sq-plus">+</span>
                  <kbd>Enter</kbd>
                  <span className="sq-action-label">Solve with AI</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
