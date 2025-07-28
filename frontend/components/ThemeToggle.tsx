"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { SunIcon, MoonIcon } from './icons';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // อ่านค่า theme จาก localStorage และ sync กับ HeroUI เมื่อ component mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('portalrpp-theme') as 'light' | 'dark' | null;
    const currentTheme = storedTheme || 'dark';
    setTheme(currentTheme);
    setMounted(true);
    
    // Sync กับ HeroUI's theme system (ใช้ class แทน data-theme)
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentTheme);
    
    console.log('ThemeToggle: Component mounted, current theme:', currentTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('ThemeToggle: Toggling theme from', theme, 'to', newTheme);
    
    // อัปเดต state
    setTheme(newTheme);
    
    // บันทึกลง localStorage
    localStorage.setItem('portalrpp-theme', newTheme);
    
    // อัปเดต class บน document (HeroUI จะจัดการ theme ให้อัตโนมัติ)
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    
    // Force re-render ของ HeroUI components
    window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
    
    console.log('ThemeToggle: Theme saved to storage:', newTheme);
  };

  const getThemeText = () => {
    // แสดง Theme ปัจจุบัน ไม่ใช่ Theme ที่จะสลับไป
    return theme === 'light' ? 'Light Theme' : 'Dark Theme';
  };

  // แสดง loading state หรือ default state ก่อน mount
  if (!mounted) {
    return (
      <Button
        variant="light"
        className="text-foreground hover:bg-content2 gap-2"
        aria-label="สลับธีม"
        isDisabled
      >
        <div className="h-5 w-5 animate-pulse bg-default-300 rounded" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  return (
    <Button
      variant="light"
      onPress={toggleTheme}
      className="text-foreground hover:bg-content2 hover:text-foreground gap-2"
      aria-label="สลับธีม"
    >
      {theme === 'light' ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
      <span className="hidden sm:inline">{getThemeText()}</span>
    </Button>
  );
}

export default ThemeToggle; 