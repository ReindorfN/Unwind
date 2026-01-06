import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark' | 'midnight';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isPublicPage: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const location = useLocation();
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('unwind_theme');
    return (saved as Theme) || 'light';
  });

  // Check if current page is a public page
  const isPublicPage = ['/', '/login', '/signup', '/emergency', '/unauthorized'].includes(location.pathname);

  useEffect(() => {
    // Apply theme class to body, but force light theme on public pages
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${isPublicPage ? 'light' : theme}`);
  }, [theme, isPublicPage]);

  const setTheme = (newTheme: Theme) => {
    // Prevent theme changes on public pages
    if (isPublicPage) return;
    
    setThemeState(newTheme);
    localStorage.setItem('unwind_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isPublicPage }}>
      {children}
    </ThemeContext.Provider>
  );
};