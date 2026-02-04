"use client";

import { useEffect } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import Link from "next/link";

import { ErrorProps } from "@/types/error";
import {
  ExclamationTriangleIcon,
  RefreshIcon,
  HomeIcon,
} from "@/components/ui/icons";

/**
 * ========================================
 * ERROR BOUNDARY COMPONENT
 * ========================================
 * Component สำหรับแสดง error boundary เมื่อเกิดข้อผิดพลาด
 * ใช้ HeroUI components และภาษาไทย
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    // TODO: ในอนาคตควรส่ง error ไปยัง error reporting service (เช่น Sentry, LogRocket)

    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-content2 to-content3">
      <div className="w-full max-w-md p-6">
        <Card className="rounded-3xl shadow-2xl border-0 bg-background/90 backdrop-blur-lg">
          <CardBody className="p-8 text-center">
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <ExclamationTriangleIcon className="w-24 h-24 text-danger-500" />
              </div>
              <h1 className="text-6xl font-bold text-danger-500 mb-4">
                เกิดข้อผิดพลาด
              </h1>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                มีบางอย่างผิดพลาด
              </h2>
              <p className="text-default-600 mb-4">
                ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
              </p>
              {error.digest && (
                <p className="text-xs text-default-500 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Button
                className="w-full font-semibold"
                color="primary"
                size="lg"
                startContent={<RefreshIcon className="w-5 h-5" />}
                onPress={reset}
              >
                ลองใหม่อีกครั้ง
              </Button>

              <Button
                as={Link}
                className="w-full"
                color="default"
                href="/"
                size="lg"
                startContent={<HomeIcon className="w-5 h-5" />}
                variant="bordered"
              >
                กลับหน้าหลัก
              </Button>
            </div>

            <div className="mt-6 p-4 bg-content2 rounded-lg">
              <p className="text-xs text-default-500">
                หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
