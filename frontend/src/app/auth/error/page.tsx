"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { XCircleIcon } from "@heroicons/react/24/outline";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "มีปัญหาในการตั้งค่าระบบ กรุณาลองใหม่อีกครั้ง";
      case "AccessDenied":
        return "การเข้าถึงถูกปฏิเสธ คุณไม่มีสิทธิ์เข้าใช้งาน";
      case "Verification":
        return "ไม่สามารถยืนยันตัวตนได้ กรุณาตรวจสอบข้อมูลและลองใหม่";
      case "Default":
        return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง";
      case "Signin":
        return "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลและลองใหม่";
      case "OAuthSignin":
        return "ไม่สามารถเข้าสู่ระบบผ่าน OAuth ได้";
      case "OAuthCallback":
        return "เกิดข้อผิดพลาดในการเชื่อมต่อ OAuth";
      case "OAuthCreateAccount":
        return "ไม่สามารถสร้างบัญชีผ่าน OAuth ได้";
      case "EmailCreateAccount":
        return "ไม่สามารถสร้างบัญชีด้วยอีเมลได้";
      case "Callback":
        return "เกิดข้อผิดพลาดในการเรียกกลับ";
      case "OAuthAccountNotLinked":
        return "บัญชี OAuth ไม่ได้เชื่อมโยงกับบัญชีของคุณ";
      case "EmailSignin":
        return "ไม่สามารถส่งอีเมลเข้าสู่ระบบได้";
      case "CredentialsSignin":
        return "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่าน";
      case "SessionRequired":
        return "กรุณาเข้าสู่ระบบก่อนใช้งาน";
      default:
        return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            เกิดข้อผิดพลาด
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
        </div>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  รหัสข้อผิดพลาด: {error || "ไม่ทราบ"}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Link
              href="/auth/login"
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md text-center hover:bg-indigo-700 transition-colors"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
            <Link
              href="/"
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md text-center hover:bg-gray-300 transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
