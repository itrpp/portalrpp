"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/NextAuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { siteConfig } from "@/config/site";

export default function CustomNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
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
      show: !!user,
    },
    {
      label: "โปรไฟล์",
      href: "/profile",
      icon: UserIcon,
      show: !!user,
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
      show: !!user,
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
      onMenuOpenChange={setIsMenuOpen}
      className="bg-white shadow-lg border-b-2 border-blue-100"
      maxWidth="full"
      height="72px"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 relative">
              <Image
                src="/images/logo.png"
                alt={siteConfig.hospitalName}
                width={48}
                height={48}
                className="w-full h-full object-contain rounded-full"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-blue-700">
                {siteConfig.projectName}
              </span>
              <span className="text-xs text-gray-500 hidden sm:block">
                {siteConfig.hospitalName}
              </span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {user && (
        <NavbarContent className="hidden sm:flex gap-6" justify="center">
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <NavbarItem key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </NavbarItem>
            ))}
        </NavbarContent>
      )}

      <NavbarContent justify="end">
        {user ? (
          <div className="flex items-center space-x-4">
            {/* Notification Badge */}
            <Badge
              content="3"
              color="danger"
              size="sm"
              className="cursor-pointer"
              onClick={handleNotificationsClick}
            >
              <BellIcon className="w-6 h-6 text-gray-600 hover:text-blue-600 transition-colors" />
            </Badge>

            {/* User Dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <User
                  as="button"
                  name={user.name}
                  description={
                    user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"
                  }
                  className="transition-transform hover:scale-105 cursor-pointer"
                  avatarProps={{
                    src: undefined,
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
                />
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Profile Actions"
                className="w-80 p-0"
                topContent={
                  <div className="flex flex-col items-center py-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                    {/* Profile Image */}
                    <div className="relative mb-4">
                      <Avatar
                        src={undefined}
                        name={user.name?.charAt(0) || "U"}
                        size="lg"
                        className="w-20 h-20 text-2xl shadow-lg border-4 border-white"
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
                      <div className="font-bold text-gray-800 text-lg">
                        {user.name}
                      </div>
                    </div>

                    {/* Profile Position */}
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        {user.role === "admin"
                          ? "👑 ผู้ดูแลระบบ"
                          : "👤 เจ้าหน้าที่"}
                      </div>
                    </div>

                    {/* Detail Toggle Button */}
                    <button
                      onClick={toggleDetail}
                      className="text-sm text-gray-600 hover:text-blue-600 mb-4 bg-white border border-gray-200 rounded-md px-3 py-1 transition-colors"
                    >
                      ข้อมูลเพิ่มเติม {isDetailExpanded ? "▲" : "▼"}
                    </button>

                    {/* Profile Details */}
                    {isDetailExpanded && (
                      <div className="w-full px-4 mb-4">
                        <div className="border border-gray-200 rounded-lg p-4 text-sm bg-white shadow-sm">
                          <div className="mb-3">
                            <span className="font-semibold text-gray-700 block mb-1">
                              หน่วยงาน
                            </span>
                            <span className="text-gray-600">
                              {siteConfig.hospitalName}
                            </span>
                          </div>
                          <div className="mb-3">
                            <span className="font-semibold text-gray-700 block mb-1">
                              ฝ่าย
                            </span>
                            <span className="text-gray-600">
                              ฝ่ายเทคโนโลยีสารสนเทศ
                            </span>
                          </div>
                          <div className="mb-3">
                            <span className="font-semibold text-gray-700 block mb-1">
                              อีเมล
                            </span>
                            <span className="text-gray-600">{user.email}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700 block mb-1">
                              สถานะ
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
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
                  startContent={<UserIcon className="w-5 h-5 text-gray-600" />}
                  onClick={handleProfileClick}
                >
                  <span className="text-gray-700 font-medium">
                    ข้อมูลส่วนตัว
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="password"
                  className="py-3 px-4"
                  startContent={<KeyIcon className="w-5 h-5 text-gray-600" />}
                  onClick={handlePasswordClick}
                >
                  <span className="text-gray-700 font-medium">
                    แก้ไขรหัสผ่าน
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="notifications"
                  className="py-3 px-4"
                  startContent={<BellIcon className="w-5 h-5 text-gray-600" />}
                  onClick={handleNotificationsClick}
                >
                  <span className="text-gray-700 font-medium">แจ้งเตือน</span>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  className="py-3 px-4 text-red-600"
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
                as={Link}
                href="/auth/login"
                color="primary"
                variant="ghost"
                className="font-medium"
              >
                เข้าสู่ระบบ
              </Button>
            </NavbarItem>
            <NavbarItem>
              <Button
                as={Link}
                href="/auth/register"
                color="primary"
                className="font-medium"
              >
                สมัครสมาชิก
              </Button>
            </NavbarItem>
          </div>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="pt-6">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <NavbarItem key={item.href}>
              <Link
                href={item.href}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-3 px-4 rounded-lg hover:bg-blue-50 w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-lg">{item.label}</span>
              </Link>
            </NavbarItem>
          ))}
        {user && (
          <NavbarItem>
            <Button
              color="danger"
              variant="ghost"
              className="w-full justify-start font-medium text-lg py-3"
              startContent={<ArrowRightOnRectangleIcon className="w-5 h-5" />}
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
