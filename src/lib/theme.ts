import type { Theme, ThemeConfig } from '../types';

export const themes: Record<Theme['id'], ThemeConfig> = {
  light: {
    background: '#ffffff',
    text: '#1f2937',
    primary: '#3b82f6',
    secondary: '#6b7280',
    accent: '#2563eb',
    buttonText: '#ffffff',
    buttonBackground: '#3b82f6',
    buttonHover: '#2563eb',
    cardBackground: '#ffffff',
    borderColor: '#e5e7eb',
  },
  dark: {
    background: '#111827',
    text: '#f3f4f6',
    primary: '#3b82f6',
    secondary: '#9ca3af',
    accent: '#60a5fa',
    buttonText: '#ffffff',
    buttonBackground: '#3b82f6',
    buttonHover: '#2563eb',
    cardBackground: '#1f2937',
    borderColor: '#374151',
  },
  gradient: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #065f46 50%, #4c1d95 100%)',
    text: '#ffffff',
    primary: '#60a5fa',
    secondary: '#9ca3af',
    accent: '#34d399',
    buttonText: '#ffffff',
    buttonBackground: 'rgba(59, 130, 246, 0.9)',
    buttonHover: 'rgba(37, 99, 235, 0.9)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
};

export const getStoredTheme = (): Theme['id'] => {
  const storedTheme = localStorage.getItem('theme');
  return (storedTheme as Theme['id']) || 'light';
};

export const setStoredTheme = (theme: Theme['id']) => {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
};

export const applyTheme = (theme: Theme['id']) => {
  const themeConfig = themes[theme];
  const root = document.documentElement;

  Object.entries(themeConfig).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  setStoredTheme(theme);
};