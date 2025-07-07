"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAuth } from "@/contexts/NextAuthContext";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Divider,
  Link as HeroLink,
  Chip,
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

export default function LoginPage() {
  const [loginType, setLoginType] = useState("auto"); // auto, local, ldap
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();

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
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn(loginType, {
        email: username,
        username: username,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      let errorMessage = "เกิดข้อผิดพลาดที่ไม่คาดคิด";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="min-h-screen flex">
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="pb-0 pt-6 px-6 flex-col items-center">
              {/* Logo */}
              <div className="w-20 h-20 mb-4">
                <Image
                  src="/images/logo.png"
                  alt={siteConfig.hospitalName}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain rounded-full shadow-lg transition-transform hover:scale-105"
                  priority
                />
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  เข้าสู่ระบบ
                </h1>
                <p className="text-gray-600">{siteConfig.projectName}</p>
                <p className="text-sm text-gray-500">
                  {siteConfig.hospitalName}
                </p>
              </div>
            </CardHeader>

            <CardBody className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Login Type Selection */}
                <div className="flex gap-2 mb-4 justify-center">
                  <Chip
                    variant={loginType === "auto" ? "solid" : "bordered"}
                    color={loginType === "auto" ? "primary" : "default"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => setLoginType("auto")}
                  >
                    Auto
                  </Chip>
                  <Chip
                    variant={loginType === "local" ? "solid" : "bordered"}
                    color={loginType === "local" ? "secondary" : "default"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => setLoginType("local")}
                  >
                    Local
                  </Chip>
                  <Chip
                    variant={loginType === "ldap" ? "solid" : "bordered"}
                    color={loginType === "ldap" ? "success" : "default"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => setLoginType("ldap")}
                  >
                    LDAP
                  </Chip>
                </div>

                {/* Username/Email Field */}
                <Input
                  type="text"
                  variant="bordered"
                  size="lg"
                  label={getUsernameConfig.label}
                  placeholder={getUsernameConfig.placeholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  isRequired
                  aria-label={getUsernameConfig.ariaLabel}
                  startContent={
                    <UserIcon className="w-5 h-5 text-default-400 pointer-events-none flex-shrink-0" />
                  }
                  className="transition-all duration-200"
                  classNames={{
                    input: "text-sm",
                    inputWrapper:
                      "hover:border-primary-400 focus-within:border-primary-500",
                  }}
                />

                {/* Password Field */}
                <Input
                  type={isPasswordVisible ? "text" : "password"}
                  variant="bordered"
                  size="lg"
                  label="รหัสผ่าน"
                  placeholder="กรุณากรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isRequired
                  aria-label="Password field"
                  startContent={
                    <KeyIcon className="w-5 h-5 text-default-400 pointer-events-none flex-shrink-0" />
                  }
                  endContent={
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      aria-label={
                        isPasswordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                      }
                      className="focus:outline-none transition-colors hover:text-primary-500"
                    >
                      {isPasswordVisible ? (
                        <EyeSlashIcon className="w-5 h-5 text-default-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-default-400" />
                      )}
                    </button>
                  }
                  className="transition-all duration-200"
                  classNames={{
                    input: "text-sm",
                    inputWrapper:
                      "hover:border-primary-400 focus-within:border-primary-500",
                  }}
                />

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-medium py-6 text-lg transition-all duration-200 hover:scale-[1.02]"
                  isLoading={isLoading}
                  disabled={isLoading || !username.trim() || !password.trim()}
                  startContent={
                    !isLoading && <ShieldCheckIcon className="w-5 h-5" />
                  }
                  spinner={<Spinner color="white" size="sm" />}
                >
                  {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <Divider className="flex-1" />
                  <span className="px-3 text-gray-400 text-sm">หรือ</span>
                  <Divider className="flex-1" />
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    ยังไม่มีบัญชี?{" "}
                    <HeroLink
                      as={Link}
                      href="/auth/register"
                      color="primary"
                      className="font-medium transition-all hover:underline"
                    >
                      สมัครสมาชิก
                    </HeroLink>
                  </p>
                </div>

                {/* Home Link */}
                <div className="text-center">
                  <HeroLink
                    as={Link}
                    href="/"
                    color="foreground"
                    className="text-sm font-medium flex items-center justify-center gap-2 transition-all hover:text-primary-600"
                  >
                    <HomeIcon className="w-4 h-4" />
                    กลับหน้าหลัก
                  </HeroLink>
                </div>
              </form>

              {/* Privacy Policy */}
              <div className="mt-6 text-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                เมื่อเข้าสู่ระบบจะถือว่าท่านยอมรับใน{" "}
                <HeroLink
                  as={Link}
                  href="/policy"
                  target="_blank"
                  color="primary"
                  className="text-xs transition-all hover:underline"
                >
                  นโยบายข้อมูลส่วนบุคคล
                </HeroLink>{" "}
                ของเรา
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Side - Hospital Info */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundImage: `url('/images/login-bg.png')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-indigo-700/80" />
          <div className="relative z-10 p-12 text-white text-center">
            <div className="mb-8">
              <HeartIcon className="w-16 h-16 mx-auto mb-4 text-white animate-pulse" />
              <h1 className="text-4xl font-bold mb-4 animate-in fade-in-50 duration-1000">
                {siteConfig.hospitalName}
              </h1>
              <p className="text-xl mb-6 opacity-90 animate-in fade-in-50 duration-1000 delay-300">
                {siteConfig.projectName}
              </p>
              <p className="text-lg opacity-75 max-w-md mx-auto animate-in fade-in-50 duration-1000 delay-500">
                ระบบจัดการข้อมูลแบบ Digital Transformation
                สำหรับการให้บริการที่มีคุณภาพและประสิทธิภาพ
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105">
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-sm opacity-75">บริการตลอดเวลา</div>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105">
                <div className="text-3xl font-bold mb-2">100%</div>
                <div className="text-sm opacity-75">ความปลอดภัย</div>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105">
                <div className="text-3xl font-bold mb-2">99.9%</div>
                <div className="text-sm opacity-75">ความเสถียร</div>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105">
                <div className="text-3xl font-bold mb-2">
                  v{siteConfig.version}
                </div>
                <div className="text-sm opacity-75">เวอร์ชันล่าสุด</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
