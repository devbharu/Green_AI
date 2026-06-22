import React, { useState } from 'react';

interface Props {
  apiKey: string;
  model: string;
  systemPrompt: string;
  onSaveApiKey: (key: string) => void;
  onSaveModel: (model: string) => void;
  onSaveSystemPrompt: (prompt: string) => void;
}

const MODELS = [
  { value: 'gemma4:31b-cloud',       label: 'gemma4:31b-cloud (Vision & Text)', vision: true },
  { value: 'gpt-oss:120b-cloud',     label: 'gpt-oss:120b-cloud (Text)', vision: false },
  { value: 'qwen3-coder:480b-cloud', label: 'qwen3-coder:480b-cloud (Text)', vision: false },
  { value: 'gpt-oss:20b-cloud',      label: 'gpt-oss:20b-cloud (Text)', vision: false },
  { value: 'minimax-m3:cloud',       label: 'minimax-m3:cloud (Vision & Text)', vision: true },
  { value: 'nemotron-3-super:cloud', label: 'nemotron-3-super:cloud (Text)', vision: false },
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
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="stg-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedLabel}</span>
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
                    {model === m.value && <span className="stg-option-dot" />}
                    {m.label}
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
          <textarea
            className="stg-textarea"
            value={systemPrompt}
            onChange={(e) => onSaveSystemPrompt(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Optional system prompt..."
          />
          <span className="stg-hint">Sent as context before the images/text.</span>
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
