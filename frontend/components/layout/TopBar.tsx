"use client";

import React, { useMemo } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Breadcrumbs,
  BreadcrumbItem,
} from "@heroui/react";
import { Session } from "next-auth";

import { UserIcon, ArrowRightOnRectangleIcon } from "@/components/ui/icons";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";

interface TopBarProps {
  session: Session | null;
  pathname: string;
  isNavigating: boolean;
  handleNavigate: (href: string) => void;
  handleLogout: () => void;
}

export default function TopBar({
  session,
  pathname,
  isNavigating,
  handleNavigate,
  handleLogout,
}: TopBarProps) {
  const breadcrumbs = useMemo(() => generateBreadcrumbs(pathname), [pathname]);

  return (
    <div className="h-16 bg-background border-b border-divider flex items-center justify-end md:justify-between px-6 lg:px-6 lg:pt-0 lg:pl-6 pl-20">
      <div className="hidden md:flex items-center space-x-4">
        <Breadcrumbs
          isDisabled={isNavigating}
          itemClasses={{
            item: "text-black",
            separator: "text-black",
          }}
        >
          {breadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbs.length - 1;
            const hasNoPath = item.href === "#";

            return (
              <BreadcrumbItem
                key={`${index}-${item.href}-${item.name}`}
                startContent={Icon ? <Icon className="w-4 h-4" /> : undefined}
                onPress={() => {
                  if (!hasNoPath && !isLast && !isNavigating) {
                    handleNavigate(item.href);
                  }
                }}
              >
                {item.name}
              </BreadcrumbItem>
            );
          })}
        </Breadcrumbs>
      </div>

      <div className="flex items-center space-x-4">
        {/* User Menu - แสดงเฉพาะเมื่อมี session */}
        {session?.user && (
          <Dropdown isDisabled={isNavigating} placement="bottom-end">
            <DropdownTrigger>
              <div className="flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2">
                <Avatar
                  isBordered
                  color={
                    (session.user as any).role === "admin"
                      ? "success"
                      : "primary"
                  }
                  fallback={<UserIcon className="w-4 h-4 text-default-400" />}
                  name={
                    session.user.image
                      ? undefined
                      : (session.user as any).role === "admin"
                        ? "A"
                        : "U"
                  }
                  size="sm"
                  src={session.user.image ?? undefined}
                />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">
                    {session.user.name || session.user.email || "ผู้ใช้"}
                  </p>
                  <p className="text-xs text-foreground-400">
                    {(session.user as any).role === "admin"
                      ? "ผู้ดูแลระบบ"
                      : "ผู้ใช้งาน"}
                  </p>
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu aria-label="เมนูผู้ใช้">
              <DropdownItem
                key="profile"
                isDisabled={isNavigating}
                startContent={<UserIcon className="w-4 h-4" />}
                onPress={() => handleNavigate("/profile")}
              >
                {isNavigating && pathname === "/profile" ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    กำลังโหลด...
                  </span>
                ) : (
                  "โปรไฟล์"
                )}
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                isDisabled={isNavigating}
                startContent={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                onPress={handleLogout}
              >
                ออกจากระบบ
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
