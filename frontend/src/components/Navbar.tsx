'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className='bg-white shadow-lg'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex items-center'>
            <Link href='/' className='flex-shrink-0 flex items-center'>
              <span className='text-xl font-bold text-blue-600'>RPP Portal</span>
            </Link>

            {user && (
              <div className='hidden md:block ml-10'>
                <div className='flex items-baseline space-x-4'>
                  <Link
                    href='/dashboard'
                    className='text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium'
                  >
                    แดชบอร์ด
                  </Link>
                  <Link
                    href='/profile'
                    className='text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium'
                  >
                    โปรไฟล์
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href='/admin'
                      className='text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium'
                    >
                      จัดการผู้ใช้
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className='flex items-center'>
            {user ? (
              <div className='relative'>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className='flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                >
                  <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
                    <span className='text-white font-medium'>
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className='ml-2 text-gray-700'>{user.name}</span>
                  <span className='ml-1 text-xs text-gray-500'>({user.role})</span>
                </button>

                {showUserMenu && (
                  <div className='absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50'>
                    <Link
                      href='/profile'
                      className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                      onClick={() => setShowUserMenu(false)}
                    >
                      โปรไฟล์
                    </Link>
                    <button
                      onClick={handleLogout}
                      className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className='flex items-center space-x-4'>
                <Link
                  href='/auth/login'
                  className='text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium'
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href='/auth/register'
                  className='bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium'
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
