'use client';

import { useEffect } from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@/components/icons';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
      <div className='w-full max-w-md p-6'>
        <Card className='rounded-3xl shadow-2xl border-0 bg-background/90 backdrop-blur-lg'>
          <CardBody className='p-8 text-center'>
            <div className='flex justify-center mb-6'>
              <div className='w-20 h-20 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center'>
                <ExclamationTriangleIcon className='w-10 h-10 text-danger-600 dark:text-danger-400' />
              </div>
            </div>

            <h1 className='text-2xl font-bold text-foreground mb-4'>
              เกิดข้อผิดพลาด
            </h1>

            <p className='text-default-600 mb-6'>
              เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
            </p>

            <div className='space-y-4'>
              <Button
                color='primary'
                size='lg'
                className='w-full font-semibold'
                startContent={<ArrowPathIcon className='w-5 h-5' />}
                onClick={() => reset()}
              >
                ลองใหม่
              </Button>

              <Button
                color='default'
                variant='bordered'
                size='lg'
                className='w-full'
                onClick={() => (window.location.href = '/')}
              >
                กลับหน้าหลัก
              </Button>
            </div>

            <div className='mt-6 p-4 bg-content2 rounded-lg'>
              <p className='text-xs text-default-500'>
                รหัสข้อผิดพลาด: {error.message || 'UNKNOWN_ERROR'}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
