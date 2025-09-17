'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuToggle,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from '@heroui/react';
import {
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@/components/ui/Icons';
import { ThemeToggle } from '@/components/ui';
import { useSession, signOut } from 'next-auth/react';

// ========================================
// NAVIGATION BAR COMPONENT
// ========================================

export function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({
      redirect: true,
      callbackUrl: '/login'
    });
  };

  return (
    <Navbar
      isBordered
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className='bg-background/80 backdrop-blur-lg border-b border-divider'
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className='sm:hidden'
        />
        <NavbarBrand>
          <Link href='/' className='flex items-center space-x-2'>
            <div className='w-8 h-8 relative'>
              <Image
                src='/images/logo.png'
                alt='RPP Logo'
                width={32}
                height={32}
                className='w-full h-full object-cover rounded-full'
                priority
              />
            </div>
            <span className='font-bold text-inherit'>RPP Portal</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className='hidden sm:flex gap-4' justify='center'>
        {/* Menu items removed */}
      </NavbarContent>

      <NavbarContent justify='end'>
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>
        {session?.user && (
          <NavbarItem>
            <Dropdown placement='bottom-end'>
              <DropdownTrigger>
                <div className='flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2'>
                  <Avatar
                    isBordered
                    color='primary'
                    name={session.user.name || session.user.email || 'ผู้ใช้'}
                    size='sm'
                  />
                  <div className='hidden md:block text-left'>
                    <p className='text-sm font-medium text-foreground'>
                      {session.user.name || session.user.email || 'ผู้ใช้'}
                    </p>
                    <p className='text-xs text-foreground-400'>
                      {session.user.role === 'admin'
                        ? 'ผู้ดูแลระบบ'
                        : 'ผู้ใช้งาน'}
                    </p>
                  </div>
                </div>
              </DropdownTrigger>
              <DropdownMenu aria-label='เมนูผู้ใช้'>
                <DropdownItem
                  key='profile'
                  startContent={<UserIcon className='w-4 h-4' />}
                >
                  <Link href='/profile'>โปรไฟล์</Link>
                </DropdownItem>
                <DropdownItem
                  key='settings'
                  startContent={<Cog6ToothIcon className='w-4 h-4' />}
                >
                  <Link href='/settings'>ตั้งค่า</Link>
                </DropdownItem>
                <DropdownItem
                  key='logout'
                  color='danger'
                  startContent={
                    <ArrowRightOnRectangleIcon className='w-4 h-4' />
                  }
                  onPress={handleLogout}
                >
                  ออกจากระบบ
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        )}
        {!session && (
          <NavbarItem>
            <Button
              as={Link}
              color='primary'
              href='/login'
              variant='flat'
              startContent={<UserIcon className='w-4 h-4' />}
            >
              เข้าสู่ระบบ
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarMenu>
        {/* Menu items removed */}
      </NavbarMenu>
    </Navbar>
  );
}
