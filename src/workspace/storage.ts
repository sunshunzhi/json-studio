import { useEffect, useState } from 'react';
import { exampleName, exampleText } from './example';

const sourceKey = 'json-studio:source:v1';
const themeKey = 'json-studio:theme:v1';
export type Source = { text: string; name: string };
export type Theme = 'light' | 'dark';

export function readSource(): Source {
  try {
    const raw = localStorage.getItem(sourceKey);
    if (raw) {
      const stored = JSON.parse(raw);
      if (typeof stored?.text === 'string' && typeof stored.name === 'string') {
        return { name: stored.name, text: stored.text.replace(/\r\n?/g, '\n') };
      }
    }
  } catch {
    // The editor still works if storage is disabled or the cached draft is corrupted.
  }
  return { text: exampleText, name: exampleName };
}

export function readTheme(): Theme {
  try {
    return localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useStorePreferences(source: Source, theme: Theme) {
  const [savedSource, setSavedSource] = useState<Source>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    function save() {
      try {
        localStorage.setItem(sourceKey, JSON.stringify(source));
        setSavedSource(source);
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      }
    }
    const timer = window.setTimeout(save, 260);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [source]);

  useEffect(() => {
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      // Theme remains available for the current session.
    }
  }, [theme]);

  if (unavailable) return '本机保存不可用';
  return savedSource === source ? '已保存到本机' : '正在保存…';
}
