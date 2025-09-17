'use client';

import Link from 'next/link';
import { Button, Card, CardBody } from '@heroui/react';
import { HomeIcon, ArrowLeftIcon } from '@/components/ui/Icons';

export default function NotFound() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
      <div className='w-full max-w-md p-6'>
        <Card className='rounded-3xl shadow-2xl border-0 bg-background/90 backdrop-blur-lg'>
          <CardBody className='p-8 text-center'>
            <div className='mb-6'>
              <h1 className='text-8xl font-bold text-primary-500 mb-4'>404</h1>
              <h2 className='text-2xl font-bold text-foreground mb-4'>
                ไม่พบหน้าเว็บ
              </h2>
              <p className='text-default-600'>
                หน้าที่คุณกำลังค้นหาไม่มีอยู่ในระบบ
              </p>
            </div>

            <div className='space-y-4'>
              <Button
                color='primary'
                size='lg'
                className='w-full font-semibold'
                startContent={<HomeIcon className='w-5 h-5' />}
                as={Link}
                href='/'
              >
                กลับหน้าหลัก
              </Button>

              <Button
                color='default'
                variant='bordered'
                size='lg'
                className='w-full'
                startContent={<ArrowLeftIcon className='w-5 h-5' />}
                onClick={() => window.history.back()}
              >
                กลับไปหน้าก่อนหน้า
              </Button>
            </div>

            <div className='mt-6 p-4 bg-content2 rounded-lg'>
              <p className='text-xs text-default-500'>
                หากคุณเชื่อว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
