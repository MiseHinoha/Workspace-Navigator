import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'ui_theme';
type Theme = 'light' | 'dark';
const THEME_CHANGE_EVENT = 'workspace-navigator-theme-change';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : getInitialTheme();
  });

  useEffect(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    setTheme(initial);

    const onThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<Theme>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange as EventListener);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange as EventListener);
  }, []);

  const toggleTheme = () => {
    const currentTheme: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: nextTheme }));
  };

  return { theme, toggleTheme };
}
