'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100'>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-lg shadow-lg p-8'>
          <div className='text-red-600 text-6xl mb-4'>🚫</div>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>ไม่มีสิทธิ์เข้าถึง</h1>
          <p className='text-gray-600 mb-6'>
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่านี่เป็นข้อผิดพลาด
          </p>
          <div className='space-y-3'>
            <Link
              href='/dashboard'
              className='block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors'
            >
              กลับไปแดชบอร์ด
            </Link>
            <Link
              href='/'
              className='block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors'
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
