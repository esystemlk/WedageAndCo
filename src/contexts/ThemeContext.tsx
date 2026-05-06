import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('fleet-theme');
    return (saved as Theme) || 'dark';
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    return localStorage.getItem('fleet-primary-color') || (theme === 'dark' ? '#6366f1' : '#4f46e5');
  });

  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem('fleet-accent-color') || (theme === 'dark' ? '#6366f1' : '#4f46e5');
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('fleet-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    localStorage.setItem('fleet-primary-color', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--accent-color', accentColor);
    localStorage.setItem('fleet-accent-color', accentColor);
  }, [accentColor]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      primaryColor, 
      setPrimaryColor, 
      accentColor, 
      setAccentColor 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
