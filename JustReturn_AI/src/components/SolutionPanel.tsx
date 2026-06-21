// src/components/SolutionPanel.tsx
import React, { useEffect, useRef, useDeferredValue, Suspense } from 'react';

const MarkdownRenderer = React.lazy(() => import('./MarkdownRenderer'));

interface Props {
  solution: string;
  isProcessing: boolean;
  error: string;
}

export function SolutionPanel({ solution, isProcessing, error }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const deferredSolution = useDeferredValue(solution);

  useEffect(() => {
    if (isProcessing) {
      endRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [solution, isProcessing]);

  return (
    <div className="sp-root" onMouseDown={(e) => e.preventDefault()}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sp-header">
        <span className="sp-title">Solution</span>
        {isProcessing && (
          <div className="sp-streaming-badge">
            <span>Streaming...</span>
          </div>
        )}
      </div>



      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="sp-content">
        {error ? (
          <div className="sp-error">{error}</div>
        ) : !solution ? (
          <div className="sp-skeleton">
            <div className="skeleton-line" style={{ width: '100%' }} />
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line" style={{ width: '60%' }} />
          </div>
        ) : (
          <Suspense fallback={
            <div className="sp-skeleton">
              <div className="skeleton-line" style={{ width: '100%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
            </div>
          }>
            <MarkdownRenderer content={deferredSolution} />
          </Suspense>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="sp-footer">
        <div className="sp-action">
          <kbd>Ctrl/Cmd</kbd>
          <span className="sp-plus">+</span>
          <kbd>G</kbd>
          <span className="sp-action-label">Back to Queue</span>
        </div>
      </div>
    </div>
  );
}
