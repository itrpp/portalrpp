'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button, Chip, Link as HeroUILink } from '@heroui/react';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
} from '../icons';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  isNew?: boolean;
  subItems?: SidebarItem[];
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // ตรวจสอบ theme เมื่อ component mount
  useEffect(() => {
    const savedTheme =
      (localStorage.getItem('portalrpp-theme') as 'light' | 'dark') || 'light';
    setCurrentTheme(savedTheme);

    // ฟังก์ชันสำหรับติดตามการเปลี่ยนแปลง theme
    const handleThemeChange = () => {
      const theme =
        (document.documentElement.getAttribute('data-theme') as
          | 'light'
          | 'dark') || 'light';
      setCurrentTheme(theme);
    };

    // ใช้ MutationObserver เพื่อติดตามการเปลี่ยนแปลง data-theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const navigationSections: SidebarSection[] = [
    {
      title: 'ภาพรวม',
      items: [
        {
          name: 'หน้าแรก',
          href: '/',
          icon: HomeIcon,
        },
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: Squares2X2Icon,
        },
      ],
    },
    {
      title: 'ระบบงานจัดเก็บรายได้',
      items: [
        {
          name: 'สถิติการดำเนินการ',
          href: '/revenue',
          icon: ChartBarIcon,
        },
        {
          name: 'นำเข้าไฟล์',
          href: '#',
          icon: ArrowDownTrayIcon,
          subItems: [
            {
              name: 'DBF',
              href: '/import/dbf',
              icon: DocumentTextIcon,
            },
            {
              name: 'REP',
              href: '/import/rep',
              icon: DocumentTextIcon,
            },
            {
              name: 'Statement',
              href: '/import/statement',
              icon: DocumentTextIcon,
            },
          ],
        },
        {
          name: 'ส่งออกข้อมูล',
          href: '#',
          icon: ArrowUpTrayIcon,
        },
      ],
    },
    {
      title: 'ผู้ดูแลระบบ',
      items: [
        {
          name: 'รายชื่อผู้ใช้งาน',
          href: '#',
          icon: UserIcon,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleMobileClose = () => {
    setIsMobileOpen(false);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const renderSidebarItem = (item: SidebarItem, isSubItem = false) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.has(item.name);
    const isItemActive = isActive(item.href);

    return (
      <div key={item.name} className={`px-2 ${isSubItem ? 'ml-4' : ''}`}>
        {item.href === '#' ? (
          <Button
            variant='light'
            className={`sidebar-item w-full justify-start h-10 group ${
              isItemActive ? 'active' : ''
            }`}
            startContent={
              <item.icon
                className={`w-4 h-4 transition-colors ${
                  isItemActive
                    ? 'text-white'
                    : 'text-default-600 group-hover:text-primary-500'
                }`}
              />
            }
            endContent={
              <div className='flex items-center gap-1'>
                {item.badge && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='primary'
                    className='sidebar-chip-primary'
                  >
                    {item.badge}
                  </Chip>
                )}
                {hasSubItems && (
                  <ChevronRightIcon
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </div>
            }
            onPress={() => {
              if (hasSubItems) {
                toggleExpanded(item.name);
              } else if (item.name === 'ออกจากระบบ') {
                // handleLogout();
              }
              handleMobileClose();
            }}
          >
            {!isCollapsed && (
              <div className='flex items-center justify-between w-full'>
                <span>{item.name}</span>
                {item.count && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='primary'
                    className='sidebar-chip-primary'
                  >
                    {item.count}
                  </Chip>
                )}
                {item.isNew && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='success'
                    className='sidebar-chip-secondary'
                  >
                    ใหม่
                  </Chip>
                )}
              </div>
            )}
          </Button>
        ) : (
          <Button
            as={HeroUILink}
            href={item.href}
            variant='light'
            className={`sidebar-item w-full justify-start h-10 group ${
              isItemActive ? 'active' : ''
            }`}
            startContent={
              <item.icon
                className={`w-4 h-4 transition-colors ${
                  isItemActive
                    ? 'text-white'
                    : 'text-default-600 group-hover:text-primary-500'
                }`}
              />
            }
            endContent={
              <div className='flex items-center gap-1'>
                {item.badge && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='primary'
                    className='sidebar-chip-primary'
                  >
                    {item.badge}
                  </Chip>
                )}
                {hasSubItems && (
                  <ChevronRightIcon
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </div>
            }
            onPress={handleMobileClose}
          >
            {!isCollapsed && (
              <div className='flex items-center justify-between w-full'>
                <span>{item.name}</span>
                {item.count && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='primary'
                    className='sidebar-chip-primary'
                  >
                    {item.count}
                  </Chip>
                )}
                {item.isNew && (
                  <Chip
                    size='sm'
                    variant='flat'
                    color='success'
                    className='sidebar-chip-secondary'
                  >
                    ใหม่
                  </Chip>
                )}
              </div>
            )}
          </Button>
        )}

        {/* Render sub-items */}
        {hasSubItems && isExpanded && !isCollapsed && (
          <div className='mt-1 space-y-1'>
            {item.subItems!.map((subItem) => renderSidebarItem(subItem, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <Button
          isIconOnly
          variant='light'
          onPress={() => setIsMobileOpen(true)}
          className='bg-background border border-divider shadow-lg hover:bg-content2 transition-colors'
          size='sm'
        >
          <Bars3Icon className='w-4 h-4 text-foreground' />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className='lg:hidden fixed inset-0 backdrop-blur-sm bg-background/80 z-40'
          onClick={handleMobileClose}
        />
      )}

      {/* Sidebar - รองรับ Light/Dark Theme */}
      <div
        className={`
        sidebar fixed lg:static inset-y-0 left-0 z-50
        h-screen

        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        
        transition-all duration-300 ease-in-out
      `}
      >
        <div className='flex flex-col h-full'>
          {/* Header - พื้นหลังสีฟ้าอ่อน */}
          <div className='sidebar-header h-16 px-6 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Image
                src='/images/logo.png'
                alt='Portal RPP Logo'
                width={32}
                height={32}
                className='w-8 h-8 object-contain'
                priority
              />
              {!isCollapsed && (
                <span className='font-bold text-xl text-foreground'>
                  Portal RPP
                </span>
              )}
            </div>

            {/* Mobile Close Button */}
            <div className='lg:hidden'>
              <Button
                isIconOnly
                variant='light'
                onPress={handleMobileClose}
                size='sm'
                className='text-foreground hover:bg-content2 transition-colors'
              >
                <XMarkIcon className='w-4 h-4' />
              </Button>
            </div>
          </div>

          {/* Navigation - รองรับการ scroll และ theme */}
          <div className='sidebar-navigation flex-1 overflow-y-auto'>
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} className='py-2'>
                {!isCollapsed && (
                  <div className='px-4 py-2'>
                    <h3 className='text-xs font-semibold text-default-500 uppercase tracking-wider'>
                      {section.title}
                    </h3>
                  </div>
                )}

                <div className='space-y-1'>
                  {section.items.map((item) => renderSidebarItem(item))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
