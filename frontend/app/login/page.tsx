'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
  Input,
  Button,
  Divider,
  Card,
  CardBody,
  ButtonGroup,
} from '@heroui/react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/ui';
import {
  UserIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@/components/ui/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useLDAP, setUseLDAP] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // ถ้ามี session แล้วให้ redirect ไปหน้าแรก
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setShouldRedirect(true);
    }
  }, [session, status]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push('/dashboard');
    }
  }, [shouldRedirect, router]);

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
        <div className='text-center'>
          <div className='rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          <p className='mt-4 text-default-600 dark:text-default-400'>
            กำลังตรวจสอบการเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && session) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
        <div className='text-center'>
          <div className='rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          <p className='mt-4 text-default-600 dark:text-default-400'>
            กำลังเปลี่ยนหน้า...
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await signIn('credentials', {
        email: username,
        password,
        authMethod: useLDAP ? 'ldap' : 'local',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setSuccessMessage('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...');
        setTimeout(() => {
          setShouldRedirect(true);
        }, 1000);
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = () => {
    // ล้าง error เมื่อผู้ใช้เริ่มพิมพ์
    if (error) {
      setError('');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
      {/* Theme Toggle Button - Top Right */}
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>

      <div className='w-full max-w-md p-6 sm:p-8'>
        <Card className='rounded-3xl shadow-2xl border-0 bg-background/90 backdrop-blur-lg'>
          <CardBody className='p-8'>
            <div className='flex flex-col items-center mb-8'>
              <Image
                src='/images/logo.png'
                alt='โรงพยาบาลราชพิพัฒน์'
                width={90}
                height={90}
                className='rounded-full bg-background'
                priority
              />
              <h1 className='mt-6 text-2xl font-extrabold text-foreground tracking-tight'>
                เข้าสู่ระบบ
              </h1>
              <p className='text-default-600 dark:text-default-400 text-sm mt-1'>
                {siteConfig.projectName}
              </p>
            </div>

            {/* Authentication Method Toggle */}
            <div className='mb-6'>
              <div className='flex items-center justify-center mb-3'>
                <span className='text-sm font-medium text-foreground'>
                  เลือกวิธีการเข้าสู่ระบบ:
                </span>
              </div>
              <ButtonGroup variant='bordered' size='sm' className='w-full'>
                <Button
                  variant={!useLDAP ? 'solid' : 'bordered'}
                  color={!useLDAP ? 'primary' : 'default'}
                  className='flex-1'
                  onClick={() => setUseLDAP(false)}
                >
                  <UserIcon className='w-4 h-4 mr-2' />
                  Local
                </Button>
                <Button
                  variant={useLDAP ? 'solid' : 'bordered'}
                  color={useLDAP ? 'primary' : 'default'}
                  className='flex-1'
                  onClick={() => setUseLDAP(true)}
                >
                  <LockClosedIcon className='w-4 h-4 mr-2' />
                  LDAP
                </Button>
              </ButtonGroup>
            </div>

            <form onSubmit={handleLogin} className='space-y-5'>
              <div>
                <Input
                  type='text'
                  label={useLDAP ? 'ชื่อผู้ใช้ LDAP' : 'อีเมล'}
                  placeholder={useLDAP ? 'กรอกชื่อผู้ใช้ LDAP' : 'กรอกอีเมล'}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleInputChange();
                  }}
                  startContent={<UserIcon className='w-5 h-5 text-primary' />}
                  variant='bordered'
                  size='lg'
                  required
                  className='focus-within:ring-2 focus-within:ring-primary'
                  isInvalid={!!error}
                />
              </div>
              <div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label='รหัสผ่าน'
                  placeholder='กรอกรหัสผ่าน'
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  startContent={
                    <LockClosedIcon className='w-5 h-5 text-primary' />
                  }
                  endContent={
                    <button
                      type='button'
                      tabIndex={-1}
                      className='focus:outline-none'
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className='w-5 h-5 text-default-400' />
                      ) : (
                        <EyeIcon className='w-5 h-5 text-default-400' />
                      )}
                    </button>
                  }
                  variant='bordered'
                  size='lg'
                  required
                  className='focus-within:ring-2 focus-within:ring-primary'
                  isInvalid={!!error}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className='flex items-center gap-2 text-danger text-sm bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg'>
                  <ExclamationTriangleIcon className='w-4 h-4 flex-shrink-0' />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className='flex items-center gap-2 text-success text-sm bg-success-50 dark:bg-success-900/20 p-3 rounded-lg'>
                  <CheckCircleIcon className='w-4 h-4 flex-shrink-0' />
                  <span>{successMessage}</span>
                </div>
              )}

              <Button
                type='submit'
                color='primary'
                size='lg'
                className='w-full font-semibold shadow-md'
                isLoading={isLoading}
                startContent={<ArrowRightOnRectangleIcon className='w-5 h-5' />}
                disabled={!username || !password}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>

            <div className='flex justify-between items-center mt-4 text-xs text-default-600 dark:text-default-400'>
              <button
                type='button'
                className='flex items-center gap-1 hover:text-primary hover:bg-content2 px-2 py-1 rounded'
                onClick={() => router.push('/')}
              >
                <ArrowLeftIcon className='w-4 h-4' /> กลับหน้าหลัก
              </button>
              <Link
                href='#'
                className='hover:text-primary hover:bg-content2 px-2 py-1 rounded'
                tabIndex={-1}
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>

            <Divider className='my-6' />

            <div className='text-center text-xs text-default-500 dark:text-default-400'>
              <span>
                © {new Date().getFullYear()} {siteConfig.hospitalName}
                <br />
                พัฒนาโดยฝ่ายวิชาการ โรงพยาบาลราชพิพัฒน์
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
