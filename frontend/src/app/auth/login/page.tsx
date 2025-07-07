"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Divider,
  Link as HeroLink,
  Spinner,
} from "@heroui/react";
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  UserIcon,
  KeyIcon,
  HomeIcon,
  HeartIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { siteConfig } from "@/config/site";

// สร้าง component แยกสำหรับส่วนที่ใช้ useSearchParams
function LoginContent() {
  const [loginType, setLoginType] = useState("ldap"); // auto, local, ldap
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [preventRedirect, setPreventRedirect] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);

  // Helper functions for dynamic content
  const getUsernameConfig = useMemo(() => {
    const configs = {
      auto: {
        label: "Username หรือ Email",
        placeholder: "กรุณากรอก username หรือ email",
        ariaLabel: "Username หรือ Email field",
      },
      local: {
        label: "Username",
        placeholder: "กรุณากรอก username",
        ariaLabel: "Username field",
      },
      ldap: {
        label: "Username (LDAP)",
        placeholder: "กรุณากรอก username LDAP",
        ariaLabel: "LDAP Username field",
      },
    };
    return configs[loginType as keyof typeof configs] || configs.auto;
  }, [loginType]);

  useEffect(() => {
    console.log(
      "Login page - Session status:",
      status,
      "Session exists:",
      !!session,
    );

    // เฉพาะเมื่อ status เป็น "authenticated" และมี session จริงๆ
    if (status === "authenticated" && session && session.user) {
      // ตรวจสอบว่าไม่ได้อยู่ในสถานะ error และไม่ได้ป้องกัน redirect
      if (!error && !preventRedirect) {
        // ได้รับ session แล้ว ให้ redirect ไปยัง dashboard
        const callbackUrl = searchParams.get("callbackUrl");
        const redirectTo =
          callbackUrl &&
          callbackUrl !== window.location.href &&
          !callbackUrl.includes("/auth/login")
            ? callbackUrl
            : "/dashboard";

        console.log("Session authenticated, redirecting to:", redirectTo);

        // เพิ่ม delay เล็กน้อยเพื่อให้ user เห็น success message
        setTimeout(() => {
          router.replace(redirectTo);
        }, 1000);
      }
    }
  }, [session, status, router, searchParams, error, preventRedirect]);

  // เพิ่ม useEffect เพื่อ monitor session changes
  useEffect(() => {
    console.log("Session changed:", { status, session });
  }, [status, session]);

  // เพิ่ม useEffect เพื่อป้องกัน unwanted redirect
  useEffect(() => {
    const currentUrl = window.location.href;

    // ถ้า URL มี callbackUrl ที่ซ้ำกัน และไม่มี session ให้ล้าง URL
    if (
      currentUrl.includes("callbackUrl") &&
      currentUrl.includes("/auth/login") &&
      status !== "authenticated"
    ) {
      console.log("Cleaning up unwanted callback URL");
      // ล้าง URL โดยไม่เพิ่ม history entry
      window.history.replaceState({}, document.title, "/auth/login");
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setPreventRedirect(false);

    try {
      // ทดสอบการเชื่อมต่อ API ก่อน
      console.log("Testing API connection...");
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      console.log("API_BASE_URL:", API_BASE_URL);

      try {
        const testResponse = await fetch(`${API_BASE_URL}/api/auth/health`);
        console.log("API health check response:", testResponse.status);
        if (!testResponse.ok) {
          throw new Error(`API health check failed: ${testResponse.status}`);
        }
      } catch (apiError) {
        console.error("API connection test failed:", apiError);
        setError(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ",
        );
        setIsLoading(false);
        setPreventRedirect(true);
        return;
      }

      // สร้าง timeout promise สำหรับ 5 วินาที
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("การเข้าสู่ระบบใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"),
            ),
          5000,
        );
      });

      // สร้าง login promise
      const providerId =
        loginType === "local"
          ? "local"
          : loginType === "ldap"
            ? "ldap"
            : "auto";

      console.log("Starting signIn with providerId:", providerId);
      console.log("Credentials:", { email: username, password: "***" });

      const loginPromise = signIn(providerId, {
        email: username,
        username: username,
        password: password,
        redirect: false, // ไม่ให้ NextAuth redirect อัตโนมัติ
        callbackUrl: "/dashboard", // กำหนด callback URL
      });

      // ใช้ Promise.race เพื่อให้ timeout หลังจาก 5 วินาที
      const result = await Promise.race([loginPromise, timeoutPromise]);

      console.log("Login result:", result);
      console.log("Login error details:", result?.error);
      console.log("Login result full object:", JSON.stringify(result, null, 2));

      if (result?.error) {
        // แสดง error ที่เฉพาะเจาะจงตาม error code
        let errorMessage = "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง";

        switch (result.error) {
          case "CredentialsSignin":
            errorMessage = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
            break;
          case "Configuration":
            errorMessage = "เกิดข้อผิดพลาดในการกำหนดค่าระบบ";
            break;
          case "AccessDenied":
            errorMessage = "ไม่มีสิทธิ์เข้าถึงระบบ";
            break;
          case "Verification":
            errorMessage = "เกิดข้อผิดพลาดในการยืนยันตัวตน";
            break;
          case "Default":
            errorMessage = "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง";
            break;
          default:
            errorMessage = `เกิดข้อผิดพลาด: ${result.error}`;
        }

        setError(errorMessage);
        setPreventRedirect(true);
      } else if (result?.ok) {
        // Login สำเร็จ
        console.log("Login successful, waiting for session...");
        setSuccessMessage("เข้าสู่ระบบสำเร็จ กำลังนำทางไปยังหน้าหลัก...");
        // ไม่ต้อง redirect ที่นี่ เพราะ useEffect จะจัดการให้
      } else {
        // กรณีอื่นๆ ที่ไม่ชัดเจน
        console.log("Login result unclear:", result);
        setError("เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง");
        setPreventRedirect(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง");
      }
      setPreventRedirect(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getLoginTypeDescription = () => {
    const descriptions = {
      auto: "ระบบจะตรวจสอบและเลือกวิธีการเข้าสู่ระบบที่เหมาะสมโดยอัตโนมัติ",
      local: "เข้าสู่ระบบด้วยบัญชีผู้ใช้ภายในระบบ",
      ldap: "เข้าสู่ระบบด้วยบัญชี LDAP",
    };
    return descriptions[loginType as keyof typeof descriptions];
  };

  // ตรวจสอบสถานะ session
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">
            กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  // ถ้ามี session แล้วและไม่มี error ให้แสดงข้อความ loading
  if (status === "authenticated" && session && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <ShieldCheckIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            เข้าสู่ระบบสำเร็จ
          </h2>
          <p className="text-gray-600">กำลังนำทางไปยังหน้าหลัก...</p>
          <Spinner className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <ShieldCheckIcon className="hidden h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {siteConfig.projectName}
          </h1>
          <p className="mt-2 text-gray-600">เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col gap-3 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <span className="text-lg font-semibold">เข้าสู่ระบบ</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">{getLoginTypeDescription()}</p>
          </CardHeader>

          <CardBody className="gap-4">
            {/* Login Type Selection */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={loginType === "auto" ? "solid" : "bordered"}
                color={loginType === "auto" ? "primary" : "default"}
                onClick={() => setLoginType("auto")}
                className="flex-1"
                isDisabled={true}
              >
                อัตโนมัติ
              </Button>
              <Button
                size="sm"
                variant={loginType === "local" ? "solid" : "bordered"}
                color={loginType === "local" ? "secondary" : "default"}
                onClick={() => setLoginType("local")}
                className="flex-1"
              >
                ภายใน
              </Button>
              <Button
                size="sm"
                variant={loginType === "ldap" ? "solid" : "bordered"}
                color={loginType === "ldap" ? "success" : "default"}
                onClick={() => setLoginType("ldap")}
                className="flex-1"
              >
                LDAP
              </Button>
            </div>

            <Divider />

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={getUsernameConfig.label}
                placeholder={getUsernameConfig.placeholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                startContent={<UserIcon className="h-4 w-4 text-gray-400" />}
                isRequired
                aria-label={getUsernameConfig.ariaLabel}
              />

              <Input
                label="รหัสผ่าน"
                placeholder="กรุณากรอกรหัสผ่าน"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startContent={<KeyIcon className="h-4 w-4 text-gray-400" />}
                endContent={
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="focus:outline-none"
                    aria-label="toggle password visibility"
                  >
                    {isPasswordVisible ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                }
                isRequired
                aria-label="Password field"
              />

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              )}

              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={isLoading}
                isDisabled={!username || !password}
              >
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </form>

            <Divider />

            {/* Footer Links */}
            <div className="flex flex-col gap-2 text-center">
              {/* <HeroLink
                as={Link}
                href="/auth/register"
                color="primary"
                size="sm"
              >
                ยังไม่มีบัญชี? สมัครสมาชิก
              </HeroLink> */}

              <HeroLink as={Link} href="/" color="foreground" size="sm">
                <HomeIcon className="h-4 w-4" />
                กลับสู่หน้าหลัก
              </HeroLink>
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1 text-sm text-gray-500">
            Made with <HeartIcon className="h-4 w-4 text-red-500" /> by{" "}
            {siteConfig.hospitalName}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main component ที่ห่อด้วย Suspense
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
