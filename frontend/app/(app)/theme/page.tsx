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
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
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
      {/* Primary Colors - โทนสีฟ้า */}
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h3 className='text-lg font-semibold text-primary-600'>
            🎨 Primary Colors - โทนสีฟ้า
          </h3>
          <p className='text-sm text-default-500'>
            สีหลักสำหรับ buttons, links, และ interactive elements
          </p>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-50'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 50</div>
                <div className='text-xs text-default-500'>#f0f9ff</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-100'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 100</div>
                <div className='text-xs text-default-500'>#e0f2fe</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-200'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 200</div>
                <div className='text-xs text-default-500'>#bae6fd</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-300'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 300</div>
                <div className='text-xs text-default-500'>#7dd3fc</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-400'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 400</div>
                <div className='text-xs text-default-500'>#38bdf8</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-500'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 500</div>
                <div className='text-xs text-default-500'>#0ea5e9</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-600'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 600</div>
                <div className='text-xs text-default-500'>#0284c7</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-700'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 700</div>
                <div className='text-xs text-default-500'>#0369a1</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-800'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 800</div>
                <div className='text-xs text-default-500'>#075985</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-primary-900'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Primary 900</div>
                <div className='text-xs text-default-500'>#0c4a6e</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Secondary Colors - โทนสีเขียว */}
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h3 className='text-lg font-semibold text-secondary-600'>
            🌿 Secondary Colors - โทนสีเขียว
          </h3>
          <p className='text-sm text-default-500'>
            สีรองสำหรับ accents, highlights, และ supporting elements
          </p>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-50'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 50</div>
                <div className='text-xs text-default-500'>#f0fdf4</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-100'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 100</div>
                <div className='text-xs text-default-500'>#dcfce7</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-200'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 200</div>
                <div className='text-xs text-default-500'>#bbf7d0</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-300'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 300</div>
                <div className='text-xs text-default-500'>#86efac</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-400'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 400</div>
                <div className='text-xs text-default-500'>#4ade80</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-500'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 500</div>
                <div className='text-xs text-default-500'>#22c55e</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-600'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 600</div>
                <div className='text-xs text-default-500'>#16a34a</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-700'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 700</div>
                <div className='text-xs text-default-500'>#15803d</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-800'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 800</div>
                <div className='text-xs text-default-500'>#166534</div>
              </div>
            </div>
            <div className='flex items-center gap-3 p-2 rounded-lg bg-content1 hover:bg-content2 transition-colors'>
              <div className='w-8 h-8 rounded border border-default-300 bg-secondary-900'></div>
              <div className='flex-1'>
                <div className='text-sm font-medium'>Secondary 900</div>
                <div className='text-xs text-default-500'>#14532d</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Usage Examples */}
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h3 className='text-lg font-semibold text-foreground'>📝 ตัวอย่างการใช้งาน</h3>
          <p className='text-sm text-default-500'>
            วิธีการใช้สีใน components ต่างๆ
          </p>
        </CardHeader>
        <CardBody className='space-y-4'>
          {/* Buttons */}
          <div>
            <h4 className='text-sm font-medium mb-2'>Buttons</h4>
            <div className='flex flex-wrap gap-2'>
              <button className='px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600'>
                Primary Button
              </button>
              <button className='px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600'>
                Secondary Button
              </button>
              <button className='px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200'>
                Light Primary
              </button>
              <button className='px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200'>
                Light Secondary
              </button>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h4 className='text-sm font-medium mb-2'>Cards</h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='p-4 bg-primary-50 border border-primary-200 rounded-lg'>
                <h5 className='font-medium text-primary-800 mb-2'>
                  Primary Card
                </h5>
                <p className='text-sm text-primary-600'>
                  การ์ดที่มีพื้นหลังสีฟ้าอ่อน
                </p>
              </div>
              <div className='p-4 bg-secondary-50 border border-secondary-200 rounded-lg'>
                <h5 className='font-medium text-secondary-800 mb-2'>
                  Secondary Card
                </h5>
                <p className='text-sm text-secondary-600'>
                  การ์ดที่มีพื้นหลังสีเขียวอ่อน
                </p>
              </div>
            </div>
          </div>

          {/* Text Colors */}
          <div>
            <h4 className='text-sm font-medium mb-2'>Text Colors</h4>
            <div className='space-y-1'>
              <p className='text-primary-600'>ข้อความสีฟ้า (Primary)</p>
              <p className='text-primary-500'>
                ข้อความสีฟ้าอ่อน (Primary Light)
              </p>
              <p className='text-secondary-600'>ข้อความสีเขียว (Secondary)</p>
              <p className='text-secondary-500'>
                ข้อความสีเขียวอ่อน (Secondary Light)
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Color Usage Examples */}
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            🎯 ตัวอย่างการใช้งานสี
          </h2>
          <p className='text-sm text-default-500'>
            ตัวอย่างการใช้งานสีต่างๆ ในระบบ
          </p>
        </CardHeader>
        <CardBody className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Primary Colors Examples */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-primary-500'>
                🎨 Primary Colors (สีฟ้า)
              </h3>
              <div className='space-y-3'>
                <div className='p-3 bg-primary-500 text-white rounded-lg'>
                  <span className='font-medium'>Primary 500</span>
                  <p className='text-sm opacity-90'>
                    Buttons, Links, Focus States
                  </p>
                </div>
                <div className='p-3 bg-primary-400 text-white rounded-lg'>
                  <span className='font-medium'>Primary 400 (Light)</span>
                  <p className='text-sm opacity-90'>Hover States, Accents</p>
                </div>
                <div className='p-3 bg-primary-100 text-primary-700 rounded-lg'>
                  <span className='font-medium'>Primary Background</span>
                  <p className='text-sm'>Subtle highlights, Cards</p>
                </div>
              </div>
            </div>

            {/* Secondary Colors Examples */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-secondary-500'>
                🌿 Secondary Colors (สีเขียว)
              </h3>
              <div className='space-y-3'>
                <div className='p-3 bg-secondary-500 text-white rounded-lg'>
                  <span className='font-medium'>Secondary 500</span>
                  <p className='text-sm opacity-90'>
                    Success States, Confirmations
                  </p>
                </div>
                <div className='p-3 bg-secondary-400 text-white rounded-lg'>
                  <span className='font-medium'>Secondary 400 (Light)</span>
                  <p className='text-sm opacity-90'>
                    Status Indicators, Accents
                  </p>
                </div>
                <div className='p-3 bg-secondary-100 text-secondary-700 rounded-lg'>
                  <span className='font-medium'>Secondary Background</span>
                  <p className='text-sm'>Supporting elements, Highlights</p>
                </div>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Warning Colors Examples */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-warning-500'>
                ⚠️ Warning Colors (สีส้ม)
              </h3>
              <div className='space-y-3'>
                <div className='p-3 bg-warning-500 text-white rounded-lg'>
                  <span className='font-medium'>Warning 500</span>
                  <p className='text-sm opacity-90'>
                    Alert Messages, Notifications
                  </p>
                </div>
                <div className='p-3 bg-warning-400 text-white rounded-lg'>
                  <span className='font-medium'>Warning 400 (Light)</span>
                  <p className='text-sm opacity-90'>Caution States, Warnings</p>
                </div>
                <div className='p-3 bg-warning-100 text-warning-700 rounded-lg'>
                  <span className='font-medium'>Warning Background</span>
                  <p className='text-sm'>Attention-grabbing elements</p>
                </div>
              </div>
            </div>

            {/* Danger Colors Examples */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-danger-500'>
                🚨 Danger Colors (สีแดง)
              </h3>
              <div className='space-y-3'>
                <div className='p-3 bg-danger-500 text-white rounded-lg'>
                  <span className='font-medium'>Danger 500</span>
                  <p className='text-sm opacity-90'>
                    Error Messages, Delete Actions
                  </p>
                </div>
                <div className='p-3 bg-danger-400 text-white rounded-lg'>
                  <span className='font-medium'>Danger 400 (Light)</span>
                  <p className='text-sm opacity-90'>
                    Critical Status, Validation Errors
                  </p>
                </div>
                <div className='p-3 bg-danger-100 text-danger-700 rounded-lg'>
                  <span className='font-medium'>Danger Background</span>
                  <p className='text-sm'>Emergency notifications, Alerts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text Color Examples */}
          <div className='border-t border-divider pt-4'>
            <h3 className='text-lg font-medium mb-4 text-foreground'>
              📝 ตัวอย่างสีข้อความ
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <div className='p-3 border border-divider rounded-lg'>
                  <p className='text-primary-500 font-medium'>
                    ข้อความสีฟ้า (Primary)
                  </p>
                  <p className='text-primary-400 text-sm'>
                    ข้อความสีฟ้าอ่อน (Primary Light)
                  </p>
                  <p className='text-secondary-500 font-medium'>
                    ข้อความสีเขียว (Secondary)
                  </p>
                  <p className='text-secondary-400 text-sm'>
                    ข้อความสีเขียวอ่อน (Secondary Light)
                  </p>
                </div>
              </div>
              <div className='space-y-3'>
                <div className='p-3 border border-divider rounded-lg'>
                  <p className='text-warning-500 font-medium'>
                    ข้อความสีส้ม (Warning)
                  </p>
                  <p className='text-warning-400 text-sm'>
                    ข้อความสีส้มอ่อน (Warning Light)
                  </p>
                  <p className='text-danger-500 font-medium'>
                    ข้อความสีแดง (Danger)
                  </p>
                  <p className='text-danger-400 text-sm'>
                    ข้อความสีแดงอ่อน (Danger Light)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Usage Guidelines */}
      <Card className='w-full bg-background/90 backdrop-blur-lg border border-default-200 dark:border-default-700'>
        <CardHeader>
          <h2 className='text-xl font-semibold text-foreground'>
            📋 แนวทางการใช้งานสี
          </h2>
          <p className='text-sm text-default-500'>หลักการใช้งานสีในระบบ</p>
        </CardHeader>
        <CardBody className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Primary Colors Usage */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-primary-500'>
                🎨 Primary Colors (สีฟ้า)
              </h3>
              <ul className='text-sm space-y-2 text-default-600'>
                <li>• Buttons และ interactive elements</li>
                <li>• Links และ navigation</li>
                <li>• Form elements และ focus states</li>
                <li>• Call-to-action elements</li>
                <li>• Progress indicators</li>
              </ul>
            </div>

            {/* Secondary Colors Usage */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-secondary-500'>
                🌿 Secondary Colors (สีเขียว)
              </h3>
              <ul className='text-sm space-y-2 text-default-600'>
                <li>• Success states และ confirmations</li>
                <li>• Status indicators</li>
                <li>• Supporting elements</li>
                <li>• Accent colors</li>
                <li>• Background highlights</li>
              </ul>
            </div>
          </div>

          {/* Warning & Danger Colors Usage */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Warning Colors Usage */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-warning-500'>
                ⚠️ Warning Colors (สีส้ม)
              </h3>
              <ul className='text-sm space-y-2 text-default-600'>
                <li>• Alert messages และ notifications</li>
                <li>• Caution states และ warnings</li>
                <li>• Pending actions</li>
                <li>• Attention-grabbing elements</li>
                <li>• Temporary status indicators</li>
              </ul>
            </div>

            {/* Danger Colors Usage */}
            <div className='space-y-3'>
              <h3 className='text-lg font-medium text-danger-500'>
                🚨 Danger Colors (สีแดง)
              </h3>
              <ul className='text-sm space-y-2 text-default-600'>
                <li>• Error messages และ alerts</li>
                <li>• Delete actions และ destructive operations</li>
                <li>• Critical status indicators</li>
                <li>• Validation errors</li>
                <li>• Emergency notifications</li>
              </ul>
            </div>
          </div>

          {/* Color Accessibility */}
          <div className='border-t border-divider pt-4'>
            <h3 className='text-lg font-medium mb-3 text-foreground'>
              ♿ การเข้าถึงสี (Color Accessibility)
            </h3>
            <div className='text-sm text-default-600 space-y-2'>
              <p>
                • ใช้ contrast ratio ที่เหมาะสม (WCAG AA: 4.5:1 สำหรับ text
                ขนาดปกติ)
              </p>
              <p>• หลีกเลี่ยงการใช้สีเป็นข้อมูลเดียวในการสื่อสาร</p>
              <p>• ใช้สีร่วมกับ icons หรือ text เพื่อความชัดเจน</p>
              <p>• รองรับ dark mode และ light mode</p>
              <p>
                • ใช้ warning colors สำหรับการแจ้งเตือน และ danger colors
                สำหรับข้อผิดพลาด
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
