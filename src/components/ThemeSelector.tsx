import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme } from '../types';

interface ThemeSelectorProps {
  currentTheme: Theme['id'];
  onThemeChange: (theme: Theme['id']) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const themes: { id: Theme['id']; name: string; icon: typeof Sun }[] = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'gradient', name: 'Gradient', icon: Palette },
  ];

  return (
    <div className="flex space-x-4">
      {themes.map(({ id, name, icon: Icon }) => (
        <motion.button
          key={id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onThemeChange(id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            currentTheme === id
              ? 'bg-primary text-buttonText'
              : 'bg-cardBackground text-secondary hover:bg-opacity-80'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span>{name}</span>
        </motion.button>
      ))}
    </div>
  );
};