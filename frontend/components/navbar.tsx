"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  NavbarMenuToggle,
  NavbarMenu,
  Avatar,
  User,
  Badge,
} from "@heroui/react";
import {
  UserIcon,
  KeyIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  HeartIcon,
  PaintBrushIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";

import { siteConfig } from "@/config/site";

export default function CustomNavbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      // console.error("Logout error:", error);
    }
  };

  const toggleDetail = () => {
    setIsDetailExpanded(!isDetailExpanded);
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handlePasswordClick = () => {
    router.push("/profile?tab=password");
  };

  const handleNotificationsClick = () => {
    router.push("/notifications");
  };

  const menuItems = [
    {
      label: "หน้าหลัก",
      href: "/",
      icon: HomeIcon,
      show: true,
    },
    {
      label: "แดชบอร์ด",
      href: "/dashboard",
      icon: ChartBarIcon,
      show: isAuthenticated,
    },
    {
      label: "โปรไฟล์",
      href: "/profile",
      icon: UserIcon,
      show: isAuthenticated,
    },
    {
      label: "จัดการผู้ใช้",
      href: "/admin",
      icon: UsersIcon,
      show: user?.role === "admin",
    },
    {
      label: "บริการสุขภาพ",
      href: "/health",
      icon: HeartIcon,
      show: isAuthenticated,
    },
    {
      label: "ธีมและสี",
      href: "/theme",
      icon: PaintBrushIcon,
      show: true,
    },
    {
      label: "ตั้งค่าระบบ",
      href: "/settings",
      icon: Cog6ToothIcon,
      show: user?.role === "admin",
    },
  ];

  return (
    <Navbar
      className="bg-background border-b border-divider"
      height="72px"
      maxWidth="full"
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link className="flex items-center space-x-3" href="/">
            <div className="w-12 h-12 relative">
              <Image
                priority
                alt="โรงพยาบาลราชพิพัฒน์"
                className="rounded-full"
                height={48}
                src="/images/logo.png"
                width={48}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-primary">
                {siteConfig.projectName}
              </span>
              <span className="text-xs text-default-500 hidden sm:block">
                {siteConfig.hospitalName}
              </span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {isAuthenticated && (
        <NavbarContent aria-label="เมนูหลัก" className="hidden sm:flex gap-6" justify="center">
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <NavbarItem key={item.href}>
                <Link
                  aria-label={`ไปยังหน้า ${item.label}`}
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-content2"
                  href={item.href}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </NavbarItem>
            ))}
        </NavbarContent>
      )}

      <NavbarContent justify="end">
        {/* Theme Toggle */}
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>

        {isAuthenticated && user ? (
          <div className="flex items-center space-x-4">
            {/* Notification Badge */}
            <Badge
              aria-label="แจ้งเตือน (3 รายการ)"
              className="cursor-pointer"
              color="danger"
              content="3"
              size="sm"
              onClick={handleNotificationsClick}
            >
              <BellIcon className="w-6 h-6 text-foreground hover:text-primary transition-colors" />
            </Badge>

            {/* User Dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <User
                  aria-label={`เมนูผู้ใช้: ${user.name} (${user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"})`}
                  as="button"
                  avatarProps={{
                    name: user.name?.charAt(0) || "U",
                    size: "sm",
                    className: "w-10 h-10",
                    style: {
                      background:
                        user.role === "admin"
                          ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                          : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "white",
                    },
                  }}
                  className="transition-transform hover:scale-105 cursor-pointer"
                  description={
                    user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"
                  }
                  name={user.name}
                />
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Profile Actions"
                className="w-80 p-0"
                topContent={
                  <div className="flex flex-col items-center py-6 bg-gradient-to-br from-content2 to-content3">
                    {/* Profile Image */}
                    <div className="relative mb-4">
                      <Avatar
                        className="w-20 h-20 text-2xl shadow-lg border-4 border-background"
                        name={user.name?.charAt(0) || "U"}
                        size="lg"
                        style={{
                          background:
                            user.role === "admin"
                              ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                              : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                          color: "white",
                        }}
                      />
                      {user.role === "admin" && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            A
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Profile Name */}
                    <div className="text-center mb-2">
                      <div className="font-bold text-foreground text-lg">
                        {user.name}
                      </div>
                    </div>

                    {/* Profile Position */}
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
                        {user.role === "admin"
                          ? "👑 ผู้ดูแลระบบ"
                          : "👤 เจ้าหน้าที่"}
                      </div>
                    </div>

                    {/* Detail Toggle Button */}
                    <button
                      aria-label={isDetailExpanded ? "ซ่อนข้อมูลเพิ่มเติม" : "แสดงข้อมูลเพิ่มเติม"}
                      className="text-sm text-foreground hover:text-primary mb-4 bg-background border border-divider rounded-md px-3 py-1 transition-colors"
                      onClick={toggleDetail}
                    >
                      ข้อมูลเพิ่มเติม {isDetailExpanded ? "▲" : "▼"}
                    </button>

                    {/* Profile Details */}
                    {isDetailExpanded && (
                      <div className="w-full px-4 mb-4">
                        <div className="border border-divider rounded-lg p-4 text-sm bg-background shadow-sm">
                          <div className="mb-3">
                            <span className="font-semibold text-foreground block mb-1">
                              หน่วยงาน
                            </span>
                            <span className="text-default-500">
                              {siteConfig.hospitalName}
                            </span>
                          </div>
                          <div className="mb-3">
                            <span className="font-semibold text-foreground block mb-1">
                              ฝ่าย
                            </span>
                            <span className="text-default-500">
                              ฝ่ายเทคโนโลยีสารสนเทศ
                            </span>
                          </div>
                          <div className="mb-3">
                            <span className="font-semibold text-foreground block mb-1">
                              อีเมล
                            </span>
                            <span className="text-default-500">{user.email}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block mb-1">
                              สถานะ
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-success-100 text-success-800 text-xs">
                              🟢 ออนไลน์
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                }
              >
                <DropdownItem
                  key="profile"
                  className="py-3 px-4"
                  startContent={<UserIcon className="w-5 h-5 text-default-500" />}
                  onClick={handleProfileClick}
                >
                  <span className="text-foreground font-medium">
                    ข้อมูลส่วนตัว
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="password"
                  className="py-3 px-4"
                  startContent={<KeyIcon className="w-5 h-5 text-default-500" />}
                  onClick={handlePasswordClick}
                >
                  <span className="text-foreground font-medium">
                    แก้ไขรหัสผ่าน
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="notifications"
                  className="py-3 px-4"
                  startContent={<BellIcon className="w-5 h-5 text-default-500" />}
                  onClick={handleNotificationsClick}
                >
                  <span className="text-foreground font-medium">แจ้งเตือน</span>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  className="py-3 px-4 text-danger"
                  color="danger"
                  startContent={
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  }
                  onClick={handleLogout}
                >
                  <span className="font-medium">ออกจากระบบ</span>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <NavbarItem>
              <Button
                aria-label="เข้าสู่ระบบ"
                as={Link}
                className="font-medium"
                color="primary"
                href="/login"
                variant="ghost"
              >
                เข้าสู่ระบบ
              </Button>
            </NavbarItem>
          </div>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu aria-label="เมนูมือถือ" className="pt-6">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <NavbarItem key={item.href}>
              <Link
                aria-label={`ไปยังหน้า ${item.label}`}
                className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-content2 w-full"
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-lg">{item.label}</span>
              </Link>
            </NavbarItem>
          ))}
        {isAuthenticated && (
          <NavbarItem>
            <Button
              aria-label="ออกจากระบบ"
              className="w-full justify-start font-medium text-lg py-3"
              color="danger"
              startContent={<ArrowRightOnRectangleIcon className="w-5 h-5" />}
              variant="ghost"
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
            >
              ออกจากระบบ
            </Button>
          </NavbarItem>
        )}
      </NavbarMenu>
    </Navbar>
  );
}
