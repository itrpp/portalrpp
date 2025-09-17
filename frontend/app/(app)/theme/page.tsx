'use client';

import React from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { ThemeToggle } from '@/components/ui';

export default function ThemePage() {
  return (
    <div className='container mx-auto px-4 py-8 space-y-8 bg-background'>
      {/* Header */}
      <div className='text-center space-y-4'>
        <h1 className='text-3xl font-bold text-foreground'>
          🎨 Theme & Color Palette
        </h1>
        <p className='text-default-500 max-w-2xl mx-auto'>
          ระบบจัดการข้อมูลดิจิทัล โรงพยาบาลราชพิพัฒน์ - โทนสีฟ้าและสีเขียว
        </p>

        {/* Theme Toggle */}
        <div className='flex justify-center'>
          <ThemeToggle />
        </div>
      </div>

      {/* Theme Information */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            🌈 การตั้งค่า Theme
          </h2>
          <p className='text-sm text-default-500'>
            ข้อมูลการตั้งค่า Theme ปัจจุบัน
          </p>
        </CardHeader>
        <CardBody className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Light Theme */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-primary-500'>
                ☀️ Light Theme
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Background:</span>
                  <span className='font-mono text-default-600'>#ffffff</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Foreground:</span>
                  <span className='font-mono text-default-600'>#0f172a</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Primary:</span>
                  <span className='font-mono text-primary-500'>#0ea5e9</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Primary Light:</span>
                  <span className='font-mono text-primary-400'>#38bdf8</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Secondary:</span>
                  <span className='font-mono text-secondary-500'>#22c55e</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Secondary Light:</span>
                  <span className='font-mono text-secondary-400'>#4ade80</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Warning:</span>
                  <span className='font-mono text-warning-500'>#f59e0b</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Warning Light:</span>
                  <span className='font-mono text-warning-400'>#fbbf24</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Danger:</span>
                  <span className='font-mono text-danger-500'>#ef4444</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Danger Light:</span>
                  <span className='font-mono text-danger-400'>#f87171</span>
                </div>
              </div>
            </div>

            {/* Dark Theme */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-secondary-500'>
                🌙 Dark Theme
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Background:</span>
                  <span className='font-mono text-default-600'>#2a2a2a</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Foreground:</span>
                  <span className='font-mono text-default-600'>#ffffff</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Primary:</span>
                  <span className='font-mono text-primary-500'>#38bdf8</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Primary Light:</span>
                  <span className='font-mono text-primary-400'>#7dd3fc</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Secondary:</span>
                  <span className='font-mono text-secondary-500'>#4ade80</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Secondary Light:</span>
                  <span className='font-mono text-secondary-400'>#86efac</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Warning:</span>
                  <span className='font-mono text-warning-500'>#fbbf24</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Warning Light:</span>
                  <span className='font-mono text-warning-400'>#fcd34d</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Danger:</span>
                  <span className='font-mono text-danger-500'>#f87171</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-foreground'>Danger Light:</span>
                  <span className='font-mono text-danger-400'>#fca5a5</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Color Palette */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            🎨 Color Palette
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างสีที่ใช้ในระบบ
          </p>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {/* Primary Colors */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Primary</h4>
              <div className='space-y-1'>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-primary-500 rounded'></div>
                  <span className='text-xs text-default-600'>500</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-primary-400 rounded'></div>
                  <span className='text-xs text-default-600'>400</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-primary-300 rounded'></div>
                  <span className='text-xs text-default-600'>300</span>
                </div>
              </div>
            </div>

            {/* Secondary Colors */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Secondary</h4>
              <div className='space-y-1'>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-secondary-500 rounded'></div>
                  <span className='text-xs text-default-600'>500</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-secondary-400 rounded'></div>
                  <span className='text-xs text-default-600'>400</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-secondary-300 rounded'></div>
                  <span className='text-xs text-default-600'>300</span>
                </div>
              </div>
            </div>

            {/* Success Colors */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Success</h4>
              <div className='space-y-1'>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-success-500 rounded'></div>
                  <span className='text-xs text-default-600'>500</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-success-400 rounded'></div>
                  <span className='text-xs text-default-600'>400</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-success-300 rounded'></div>
                  <span className='text-xs text-default-600'>300</span>
                </div>
              </div>
            </div>

            {/* Warning Colors */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Warning</h4>
              <div className='space-y-1'>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-warning-500 rounded'></div>
                  <span className='text-xs text-default-600'>500</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-warning-400 rounded'></div>
                  <span className='text-xs text-default-600'>400</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-6 h-6 bg-warning-300 rounded'></div>
                  <span className='text-xs text-default-600'>300</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Typography */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            📝 Typography
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างการใช้งาน Typography
          </p>
        </CardHeader>
        <CardBody className='space-y-4'>
          <div className='space-y-2'>
            <h1 className='text-4xl font-bold text-foreground'>Heading 1</h1>
            <h2 className='text-3xl font-semibold text-foreground'>Heading 2</h2>
            <h3 className='text-2xl font-medium text-foreground'>Heading 3</h3>
            <h4 className='text-xl font-medium text-foreground'>Heading 4</h4>
            <h5 className='text-lg font-medium text-foreground'>Heading 5</h5>
            <h6 className='text-base font-medium text-foreground'>Heading 6</h6>
          </div>
          <div className='space-y-2'>
            <p className='text-base text-foreground'>Body text - ตัวอย่างข้อความปกติ</p>
            <p className='text-sm text-default-600'>Small text - ตัวอย่างข้อความเล็ก</p>
            <p className='text-xs text-default-500'>Extra small text - ตัวอย่างข้อความเล็กมาก</p>
          </div>
        </CardBody>
      </Card>

      {/* Components */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            🧩 Components
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างการใช้งาน Components
          </p>
        </CardHeader>
        <CardBody className='space-y-4'>
          {/* Cards */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium mb-2'>Cards</h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Card className='bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'>
                <CardBody>
                  <h5 className='text-sm font-medium text-primary-700 dark:text-primary-300'>
                    Primary Card
                  </h5>
                  <p className='text-sm text-primary-600 dark:text-primary-400'>
                    Subtle highlights, Cards
                  </p>
                </CardBody>
              </Card>
              <Card className='bg-secondary-50 dark:bg-secondary-900/20 border-secondary-200 dark:border-secondary-800'>
                <CardBody>
                  <h5 className='text-sm font-medium text-secondary-700 dark:text-secondary-300'>
                    Secondary Card
                  </h5>
                  <p className='text-sm text-secondary-600 dark:text-secondary-400'>
                    Subtle highlights, Cards
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Spacing */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            📏 Spacing
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างการใช้งาน Spacing
          </p>
        </CardHeader>
        <CardBody className='space-y-6'>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Space Y</h4>
              <div className='space-y-2'>
                <div className='h-4 bg-primary-200 rounded'></div>
                <div className='h-4 bg-primary-300 rounded'></div>
                <div className='h-4 bg-primary-400 rounded'></div>
              </div>
            </div>
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-foreground'>Space X</h4>
              <div className='flex space-x-2'>
                <div className='w-4 h-4 bg-secondary-200 rounded'></div>
                <div className='w-4 h-4 bg-secondary-300 rounded'></div>
                <div className='w-4 h-4 bg-secondary-400 rounded'></div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Shadows */}
      <Card className='w-full bg-default border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            🌟 Shadows
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างการใช้งาน Shadows
          </p>
        </CardHeader>
        <CardBody className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='p-4 bg-default rounded-lg shadow-sm'>
              <p className='text-sm text-foreground'>Shadow SM</p>
            </div>
            <div className='p-4 bg-default rounded-lg shadow-md'>
              <p className='text-sm text-foreground'>Shadow MD</p>
            </div>
            <div className='p-4 bg-default rounded-lg shadow-lg'>
              <p className='text-sm text-foreground'>Shadow LG</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
