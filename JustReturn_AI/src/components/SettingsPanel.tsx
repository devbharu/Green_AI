import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  apiKey: string;
  model: string;
  systemPrompt: string;
  onSaveApiKey: (key: string) => void;
  onSaveModel: (model: string) => void;
  onSaveSystemPrompt: (prompt: string) => void;
}

const MODELS = [
  { value: 'gemma4:31b-cloud',       label: 'gemma4:31b-cloud', vision: true },
  { value: 'gpt-oss:120b-cloud',     label: 'gpt-oss:120b-cloud', vision: false },
  { value: 'qwen3-coder:480b-cloud', label: 'qwen3-coder:480b-cloud', vision: false },
  { value: 'gpt-oss:20b-cloud',      label: 'gpt-oss:20b-cloud', vision: false },
  { value: 'minimax-m3:cloud',       label: 'minimax-m3:cloud', vision: true },
  { value: 'nemotron-3-super:cloud', label: 'nemotron-3-super:cloud', vision: false },
];

const SHORTCUTS = [
  { keys: ['Ctrl/Cmd', 'B'],      desc: 'Show / hide overlay' },
  { keys: ['Ctrl/Cmd', 'H'],      desc: 'Capture screenshot' },
  { keys: ['Ctrl/Cmd', 'Enter'],  desc: 'Process with AI' },
  { keys: ['Ctrl/Cmd', 'G'],      desc: 'Clear queue / back' },
  { keys: ['Ctrl/Cmd', ';'],      desc: 'Toggle settings' },
  { keys: ['Ctrl/Cmd', 'Q'],      desc: 'Quit Application' },
  { keys: ['Ctrl/Cmd', 'Arrows'], desc: 'Move overlay' },
];

// Detect platform once — avoids repeated IPC calls
const isWindows = typeof window !== 'undefined' && window.electronAPI?.getPlatform?.() === 'win32';

function VirtualPromptInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handlePaste = async () => {
    try {
      // Use the IPC method to read from the main process clipboard
      const text = await window.electronAPI.readFromClipboard();
      if (text) {
        onChange(text);
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="apple-prompt-box" style={{ cursor: 'default' }}>
        <div className="apple-prompt-content">
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="apple-prompt-placeholder">
              System prompt is empty.
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="stg-dropdown-trigger"
          style={{ flex: 1, justifyContent: 'center', height: '32px' }}
          onClick={handlePaste}
        >
          Paste from Clipboard
        </button>
        {value && (
          <button
            className="stg-dropdown-trigger"
            style={{ flex: 1, justifyContent: 'center', height: '32px', color: '#ff453a' }}
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Platform-Aware System Prompt Input ───────────────────────────────────────
// macOS: native <textarea> — NSPanel guarantees no focus stealing
// Windows: VirtualPromptInput — manual keydown capture since focusable:false
function SystemPromptInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (isWindows) {
    return <VirtualPromptInput value={value} onChange={onChange} />;
  }
  return (
    <textarea
      className="stg-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Optional system prompt..."
    />
  );
}

export const SettingsPanel = React.memo(function SettingsPanel({
  apiKey, model, systemPrompt,
  onSaveApiKey, onSaveModel, onSaveSystemPrompt
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedLabel = MODELS.find(m => m.value === model)?.label || model;

  return (
    <div className="stg-root" onClick={() => setIsDropdownOpen(false)}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="stg-header">
        <span className="stg-title">Settings</span>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="stg-body">

        {/* Model */}
        <div className="stg-section">
          <label className="stg-label">Model</label>
          <div
            className="stg-dropdown-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="stg-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span>{selectedLabel}</span>
                {(() => {
                  const m = MODELS.find(x => x.value === model);
                  return m ? (
                    <span className={`model-badge ${m.vision ? 'model-badge--vision' : 'model-badge--text'}`}>
                      {m.vision ? 'Vision' : 'Text'}
                    </span>
                  ) : null;
                })()}
              </div>
              <span className={`stg-chevron ${isDropdownOpen ? 'stg-chevron--open' : ''}`}>▼</span>
            </button>
            {isDropdownOpen && (
              <div className="stg-dropdown-options">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    className={`stg-dropdown-option ${model === m.value ? 'stg-dropdown-option--active' : ''}`}
                    onClick={() => { onSaveModel(m.value); setIsDropdownOpen(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      {model === m.value && <span className="stg-option-dot" />}
                      <span>{m.label}</span>
                    </div>
                    <span className={`model-badge ${m.vision ? 'model-badge--vision' : 'model-badge--text'}`}>
                      {m.vision ? 'Vision' : 'Text'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="stg-hint">Select the AI model for solving</span>
        </div>

        {/* System Prompt */}
        <div className="stg-section">
          <label className="stg-label">System Prompt</label>
          <SystemPromptInput value={systemPrompt} onChange={onSaveSystemPrompt} />
          <span className="stg-hint">Sent as context before images or text.</span>
        </div>

        {/* Shortcuts */}
        <div className="stg-section">
          <label className="stg-label">Shortcuts</label>
          <div className="stg-shortcuts-list">
            {SHORTCUTS.map((s) => (
              <div key={s.desc} className="stg-shortcut-card">
                <div className="stg-kbd-group">
                  {s.keys.map((k) => <kbd key={k}>{k}</kbd>)}
                </div>
                <span className="stg-shortcut-desc">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="stg-section">
          <div className="stg-note">
            <strong>macOS + Zoom users:</strong> Enable{' '}
            <em>Settings → Share Screen → Advanced Capture with window filtering</em>{' '}
            and share a specific app window (not Desktop) for full invisibility.
          </div>
          <div className="stg-note">
            <strong>100% Stealth:</strong> This overlay is always click-through.
            No click on this window can ever trigger browser focus detection.
          </div>
        </div>

      </div>
    </div>
  );
});
