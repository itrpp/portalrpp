'use client';

import React from 'react';
import { Switch } from '@heroui/react';
import { SunIcon, MoonIcon } from './Icons';

// Theme Provider Component - ใช้ HeroUI theme system
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Sync กับ localStorage และ set initial theme
    if (typeof window !== 'undefined') {
      const savedTheme =
        (localStorage.getItem('portalrpp-theme') as 'light' | 'dark') ||
        'dark'; // เปลี่ยนค่าเริ่มต้นเป็น dark
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // ไม่ render จนกว่า component จะ mount แล้ว
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
};

// Optimized Theme Toggle Component using HeroUI theme system
export function ThemeToggle() {
  const [isSelected, setIsSelected] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // ใช้ useEffect เพื่อตรวจสอบ theme เมื่อ component mount
  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      // ตรวจสอบ theme จาก data-theme attribute หรือ localStorage
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' ||
        (localStorage.getItem('portalrpp-theme') as 'light' | 'dark') ||
        'dark'; // เปลี่ยนค่าเริ่มต้นเป็น dark
      setIsSelected(currentTheme === 'dark');
    }
  }, []);

  const onValueChange = (value: boolean) => {
    setIsSelected(value);
    const newTheme = value ? 'dark' : 'light';

    // อัปเดต class บน document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);

    // อัปเดต data-theme attribute สำหรับ HeroUI
    document.documentElement.setAttribute('data-theme', newTheme);

    // บันทึกลง localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('portalrpp-theme', newTheme);
    }
  };

  // ไม่ render จนกว่า component จะ mount แล้ว
  if (!mounted) {
    return (
      <Switch
        isSelected={false}
        size='md'
        color='primary'
        isDisabled
        startContent={<SunIcon className='h-4 w-4' />}
        endContent={<MoonIcon className='h-4 w-4' />}
        aria-label='สลับธีม'
      />
    );
  }

  return (
    <Switch
      isSelected={isSelected}
      size='md'
      color='primary'
      onValueChange={onValueChange}
      startContent={<SunIcon className='h-4 w-4' />}
      endContent={<MoonIcon className='h-4 w-4' />}
      aria-label='สลับธีม'
    />
  );
}

// Custom hook สำหรับใช้ theme (สำหรับ backward compatibility)
export const useCustomTheme = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (
        (localStorage.getItem('portalrpp-theme') as 'light' | 'dark') || 'dark'
      );
    }
    return 'dark';
  });

  const toggleTheme = React.useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';

      // บันทึกลง localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('portalrpp-theme', newTheme);
      }

      // อัปเดต class บน document
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);

      return newTheme;
    });
  }, []);

  return {
    theme,
    toggleTheme,
  };
};

export default ThemeToggle;
