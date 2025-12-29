"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@heroui/react";

import {
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import type { ExtendedUser } from "@/types/ldap";

// ========================================
// HOME PAGE
// ========================================

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {siteConfig.hospitalName}
          </h1>
          <p className="text-default-600 mt-2">
            ยินดีต้อนรับสู่ระบบจัดการข้อมูล RPP Portal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-xl border border-default-200 dark:border-default-700 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-0">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto">
              <UserGroupIcon
                aria-hidden="true"
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
              />
            </div>
          </CardHeader>
          <CardBody className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              ข้อมูลผู้ใช้
            </h3>
            <p className="text-default-600 mb-4">
              {session?.user?.name || session?.user?.email || "ไม่ระบุ"}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-600">สถานะ</span>
                <span className="font-medium text-success-600">ออนไลน์</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-600">บทบาท</span>
                <span className="font-medium">
                  {(session?.user as ExtendedUser)?.role === "admin"
                    ? "ผู้ดูแลระบบ"
                    : (session?.user as ExtendedUser)?.role === "user"
                      ? "ผู้ใช้งาน"
                      : "ไม่ระบุ"}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-xl border border-default-200 dark:border-default-700 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-0">
            <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-900/20 rounded-full flex items-center justify-center mx-auto">
              <ChartBarIcon
                aria-hidden="true"
                className="w-8 h-8 text-secondary-600 dark:text-secondary-400"
              />
            </div>
          </CardHeader>
          <CardBody className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              สถิติระบบ
            </h3>
            <p className="text-default-600 mb-4">ข้อมูลการใช้งาน</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-600">การเข้าสู่ระบบ</span>
                <span className="font-medium">สำเร็จ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-600">สถานะ</span>
                <span className="font-medium text-success-600">ปกติ</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-xl border border-default-200 dark:border-default-700 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-0">
            <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/20 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheckIcon
                aria-hidden="true"
                className="w-8 h-8 text-warning-600 dark:text-warning-400"
              />
            </div>
          </CardHeader>
          <CardBody className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              การตั้งค่า
            </h3>
            <p className="text-default-600 mb-4">จัดการระบบ</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-600">การตั้งค่า</span>
                <span className="font-medium">พร้อมใช้งาน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-600">สิทธิ์</span>
                <span className="font-medium text-success-600">อนุญาต</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="shadow-xl border border-default-200 dark:border-default-700 hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              ข้อมูลระบบ
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">
                  ข้อมูลผู้ใช้
                </h3>
                <div className="space-y-1 text-sm text-default-600">
                  <p>UserID: {session?.user?.id || "ไม่ระบุ"}</p>
                  <p>ชื่อ: {session?.user?.name || "ไม่ระบุ"}</p>
                  <p>อีเมล: {session?.user?.email || "ไม่ระบุ"}</p>
                  <p>แผนก: {session?.user?.department || "ไม่ระบุ"}</p>
                  <p>
                    บทบาท:{" "}
                    {(session?.user as ExtendedUser)?.role === "admin"
                      ? "ผู้ดูแลระบบ"
                      : (session?.user as ExtendedUser)?.role === "user"
                        ? "ผู้ใช้งาน"
                        : "ไม่ระบุ"}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">สถานะระบบ</h3>
                <div className="space-y-1 text-sm text-default-600">
                  <p>
                    สถานะ: <span className="text-success-600">ออนไลน์</span>
                  </p>
                  <p>
                    การเชื่อมต่อ: <span className="text-success-600">ปกติ</span>
                  </p>
                  <p>
                    สิทธิ์การเข้าถึง:{" "}
                    <span className="text-success-600">อนุญาต</span>
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
