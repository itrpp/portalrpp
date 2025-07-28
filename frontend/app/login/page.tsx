"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Input,
  Button,
  Divider,
  Card,
  CardBody,
  Switch,
} from "@heroui/react";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginLDAP, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useLDAP, setUseLDAP] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ตรวจสอบ authentication state เมื่อ component mount
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      let success;

      if (useLDAP) {
        // LDAP Authentication
        success = await loginLDAP(username, password);
      } else {
        // Local Authentication
        success = await login(username, password, 'local');
      }

      if (success) {
        setSuccessMessage("เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...");
        // รอให้ AuthContext อัปเดต state ก่อน redirect
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (error: unknown) {
      // console.error("Login error:", error);
      
      const errorObj = error as { status?: number; message?: string };
      
      if (errorObj.status === 401) {
        setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      } else if (errorObj.status === 429) {
        setError("มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่");
      } else if (errorObj.status === 503) {
        setError("ระบบไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง");
      } else {
        setError(errorObj.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = () => {
    // ล้าง error เมื่อผู้ใช้เริ่มพิมพ์
    if (error) {
      setError("");
    }
  };

  // แสดง loading spinner ขณะตรวจสอบ authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            กำลังตรวจสอบการเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  // ถ้า login แล้วให้ redirect ไป dashboard
  if (isAuthenticated) {
    return null; // จะ redirect ใน useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500">
      <div className="w-full max-w-md p-6 sm:p-8">
        <Card className="rounded-3xl shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg">
          <CardBody className="p-8">
            <div className="flex flex-col items-center mb-8">
              <Image
                src="/images/logo.png"
                alt="โรงพยาบาลราชพิพัฒน์"
                width={90}
                height={90}
                className="rounded-full shadow-lg border-4 border-blue-200 dark:border-blue-700 bg-white"
                priority
              />
              <h1 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                เข้าสู่ระบบ
              </h1>
              <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">
                ระบบ {siteConfig.projectName}
              </p>
            </div>

            {/* Authentication Method Toggle */}
            <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  วิธีการเข้าสู่ระบบ:
                </span>
              </div>
              <Switch
                isSelected={useLDAP}
                onValueChange={setUseLDAP}
                size="sm"
                color="primary"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {useLDAP ? "LDAP" : "Local"}
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Input
                  type="text"
                  label={useLDAP ? "ชื่อผู้ใช้ LDAP" : "อีเมล"}
                  placeholder={useLDAP ? "กรอกชื่อผู้ใช้ LDAP" : "กรอกอีเมล"}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleInputChange();
                  }}
                  startContent={<UserIcon className="w-5 h-5 text-blue-400" />}
                  variant="bordered"
                  size="lg"
                  required
                  className="focus-within:ring-2 focus-within:ring-blue-400"
                  isInvalid={!!error}
                />
              </div>
              <div>
                <Input
                  type={showPassword ? "text" : "password"}
                  label="รหัสผ่าน"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  startContent={<LockClosedIcon className="w-5 h-5 text-blue-400" />}
                  endContent={
                    <button
                      type="button"
                      tabIndex={-1}
                      className="focus:outline-none"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  }
                  variant="bordered"
                  size="lg"
                  required
                  className="focus-within:ring-2 focus-within:ring-blue-400"
                  isInvalid={!!error}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm animate-pulse bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full font-semibold shadow-md hover:scale-[1.03] transition-transform"
                isLoading={isLoading}
                startContent={<LockClosedIcon className="w-5 h-5" />}
                disabled={!username || !password}
              >
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </form>

            <div className="flex justify-between items-center mt-4 text-xs text-gray-500 dark:text-gray-400">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                onClick={() => router.push("/")}
              >
                <ArrowLeftIcon className="w-4 h-4" /> กลับหน้าหลัก
              </button>
              <Link
                href="#"
                className="hover:text-blue-600 transition-colors"
                tabIndex={-1}
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>

            <Divider className="my-6" />

            <div className="text-center text-xs text-gray-400 dark:text-gray-500">
              <span>
                © {new Date().getFullYear()} {siteConfig.hospitalName}
                <br />
                พัฒนาโดยฝ่ายวิชาการ โรงพยาบาลราชพิพัฒน์
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
} 