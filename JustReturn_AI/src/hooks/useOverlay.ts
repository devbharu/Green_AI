// src/hooks/useOverlay.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export type View = 'queue' | 'solution' | 'settings';

export interface Screenshot {
  path: string;
  preview: string;
}

export function useOverlay() {
  const [view, setView] = useState<View>('queue');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKeyState] = useState('');
  const [model, setModelState] = useState('gemma4:31b-cloud');
  const [systemPrompt, setSystemPromptState] = useState('You are an elite coding assistant. You MUST format your response exactly like this:\n\n```[language]\n<your complete code here>\n```\n\nExplanation:\n<your explanation here>\n\nDo NOT write any text before the first code block.');
  const solutionRef = useRef('');

  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;

  // Load saved settings on mount
  useEffect(() => {
    if (!api) return;
    void api.getApiKey().then(setApiKeyState);
    void api.getModel().then(setModelState);
    void api.getSystemPrompt().then(setSystemPromptState);
  }, [api]);

  // Subscribe to main-process events
  useEffect(() => {
    if (!api) return;

    const offScreenshot = api.onScreenshotTaken((data) => {
      setScreenshots((prev) => [...prev, data]);
      setView('queue');
    });

    let animationFrameId: number | null = null;

    const offChunk = api.onAiResponse((chunk) => {
      solutionRef.current += chunk;
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(() => {
          setSolution(solutionRef.current);
          animationFrameId = null;
        });
      }
    });

    const offDone = api.onAiDone(() => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      setSolution(solutionRef.current); // Force final update
      setIsProcessing(false);
      setView('solution');
    });

    const offError = api.onAiError((err) => {
      setError(err);
      setIsProcessing(false);
    });

    const offProcessingStarted = api.onProcessingStarted(() => {
      setSolution('');
      solutionRef.current = '';
      setError('');
      setIsProcessing(true);
      setView('solution');
    });

    const offSetView = api.onSetView((view) => {
      setView(view as View);
    });

    const offReset = api.onResetView(() => {
      setView('queue');
      setSolution('');
      solutionRef.current = '';
      setScreenshots([]);
      setError('');
    });

    const offToggleSettings = api.onToggleSettings(() => {
      setView((prev) => (prev === 'settings' ? 'queue' : 'settings'));
    });

    return () => {
      offScreenshot();
      offChunk();
      offDone();
      offError();
      offProcessingStarted();
      offSetView();
      offReset();
      offToggleSettings();
    };
  }, [api]);

  // Notify main process of view changes for dynamic click-through behavior
  useEffect(() => {
    if (api && api.notifyViewChange) {
      api.notifyViewChange(view);
    }
  }, [view, api, screenshots.length]);

  const processScreenshots = useCallback(async () => {
    if (screenshots.length === 0 || !api) return;
    setSolution('');
    solutionRef.current = '';
    setError('');
    setIsProcessing(true);
    setView('solution');
    await api.processScreenshots(apiKey, model);
  }, [screenshots, apiKey, model, api]);

  const clearQueue = useCallback(async () => {
    if (!api) return;
    await api.clearQueue();
    setScreenshots([]);
    setSolution('');
    solutionRef.current = '';
    setError('');
    setView('queue');
  }, [api]);

  const saveApiKey = useCallback(async (key: string) => {
    setApiKeyState(key);
    if (api) await api.setApiKey(key);
  }, [api]);

  const saveModel = useCallback(async (m: string) => {
    setModelState(m);
    if (api) await api.setModel(m);
  }, [api]);

  const saveSystemPrompt = useCallback(async (p: string) => {
    setSystemPromptState(p);
    if (api) await api.setSystemPrompt(p);
  }, [api]);

  const cancelProcessing = useCallback(async () => {
    if (api) await api.cancelProcessing();
    setIsProcessing(false);
  }, [api]);

  return {
    view,
    setView,
    screenshots,
    solution,
    isProcessing,
    error,
    apiKey,
    model,
    systemPrompt,
    processScreenshots,
    clearQueue,
    saveApiKey,
    saveModel,
    saveSystemPrompt,
    cancelProcessing,
  };
}
