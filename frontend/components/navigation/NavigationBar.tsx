"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarMenuItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  User,
} from "@heroui/react";
import {
  HomeIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from "../icons";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      name: "หน้าแรก",
      href: "/",
      icon: HomeIcon,
    },
    {
      name: "แดชบอร์ด",
      href: "/dashboard",
      icon: UserIcon,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-divider"
      maxWidth="xl"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo.png"
              alt="Portal RPP Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
            <span className="font-bold text-xl text-foreground">
              Portal RPP
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.href} isActive={isActive(item.href)}>
            <Link
              href={item.href}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:text-primary"
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>

        {user ? (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2">
                  <Avatar
                    isBordered
                    color="primary"
                    name={user.displayName || user.name || user.email || "ผู้ใช้"}
                    size="sm"
                    {...(user.avatar && { src: user.avatar })}
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-foreground">
                      {user.displayName || user.name || user.email || "ผู้ใช้"}
                    </p>
                    <p className="text-xs text-foreground-400">
                      {user.role?.toLowerCase() === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                      {user.department && user.department !== "-" && ` • ${user.department}`}
                    </p>
                  </div>
                </div>
              </DropdownTrigger>
              <DropdownMenu aria-label="เมนูผู้ใช้">
                <DropdownItem key="profile" startContent={<UserIcon className="w-4 h-4" />}>
                  <Link href="/profile">โปรไฟล์</Link>
                </DropdownItem>
                <DropdownItem key="settings" startContent={<Cog6ToothIcon className="w-4 h-4" />}>
                  <Link href="/settings">ตั้งค่า</Link>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                  onPress={logout}
                >
                  ออกจากระบบ
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        ) : (
          <NavbarItem>
            <Button
              as={Link}
              color="primary"
              href="/login"
              variant="flat"
            >
              เข้าสู่ระบบ
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg ${isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:text-primary"
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          </NavbarMenuItem>
        ))}

        {!user && (
          <NavbarMenuItem>
            <Button
              as={Link}
              color="primary"
              href="/login"
              variant="flat"
              className="w-full"
              onClick={() => setIsMenuOpen(false)}
            >
              เข้าสู่ระบบ
            </Button>
          </NavbarMenuItem>
        )}
      </NavbarMenu>
    </Navbar>
  );
} 