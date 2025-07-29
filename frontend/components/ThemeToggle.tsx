"use client";

import React, { useCallback, useMemo } from 'react';
import { Button } from '@heroui/react';
import { SunIcon, MoonIcon } from './icons';

// ใช้ React Context เพื่อจัดการ theme state แบบ global
const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
} | null>(null);

// Custom hook สำหรับใช้ theme
export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Theme Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    // ใช้ lazy initialization เพื่อลดการอ่าน localStorage ทุกครั้ง
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('portalrpp-theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // ใช้ useCallback เพื่อป้องกัน re-creation ของ function
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      
      // บันทึกลง localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('portalrpp-theme', newTheme);
      }
      
      // อัปเดต class บน document
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      
      return newTheme;
    });
  }, []);

  // ใช้ useMemo เพื่อ cache context value
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme
  }), [theme, toggleTheme]);

  // ใช้ useEffect เพื่อ sync theme เมื่อ component mount
  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Optimized Theme Toggle Component
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // ใช้ useMemo เพื่อ cache icon component
  const ThemeIcon = useMemo(() => {
    return theme === 'light' ? MoonIcon : SunIcon;
  }, [theme]);

  return (
    <Button
      isIconOnly
      variant="ghost"
      onPress={toggleTheme}
      className="text-foreground hover:bg-content2 hover:text-primary transition-colors"
      aria-label="สลับธีม"
    >
      <ThemeIcon className="h-4 w-4" />
    </Button>
  );
}

export default ThemeToggle; 