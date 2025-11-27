"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Input, Button, Divider, Card, CardBody } from "@heroui/react";
import { addToast } from "@heroui/toast";

import { siteConfig } from "@/config/site";
import {
  LockClosedIcon,
  UserIcon,
  EyeSlashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const lastAuthErrorRef = useRef<string | null>(null);

  const authErrorParam = searchParams.get("error");

  const mapAuthErrorToMessage = (code: string) => {
    switch (code) {
      case "LINE_LDAP_REQUIRED":
        return "กรุณาเข้าสู่ระบบด้วยบัญชีโรงพยาบาล (LDAP) อย่างน้อยหนึ่งครั้งก่อน แล้วค่อยเชื่อมบัญชี LINE";
      case "LINE_ACCOUNT_IN_USE":
        return "บัญชี LINE นี้ถูกผูกไว้กับผู้ใช้อื่นแล้ว กรุณาให้เจ้าของบัญชีนั้นยกเลิกก่อน";
      case "LINE_ACCOUNT_ALREADY_LINKED":
        return "บัญชีของคุณมีการเชื่อม LINE อยู่แล้ว กรุณายกเลิกการเชื่อมเดิมก่อน";
      case "LINE_ACCOUNT_ID_MISSING":
        return "ไม่พบข้อมูลผู้ใช้จาก LINE กรุณาลองใหม่หรือแจ้งผู้ดูแลระบบ";
      case "OAuthAccountNotLinked":
        return "บัญชี LINE นี้เชื่อมกับผู้ใช้อื่น หรือยังไม่ได้ยืนยันกับ LDAP";
      case "AccessDenied":
        return "การเข้าถึงถูกปฏิเสธ กรุณาลองใหม่หรือแจ้งผู้ดูแลระบบ";
      default:
        return "";
    }
  };

  // อ่าน callbackUrl จาก query string และ decode
  const callbackUrl = searchParams.get("callbackUrl")
    ? decodeURIComponent(searchParams.get("callbackUrl")!)
    : "/home";

  // ถ้ามี session แล้วให้ redirect ไปหน้าเดิมหรือหน้าแรก
  useEffect(() => {
    if (status === "authenticated" && session) {
      setShouldRedirect(true);
    }
  }, [session, status]);

  useEffect(() => {
    if (shouldRedirect) {
      // ใช้ callbackUrl ถ้ามี ถ้าไม่มีใช้ /home
      router.push(callbackUrl);
    }
  }, [shouldRedirect, router, callbackUrl]);

  useEffect(() => {
    if (!authErrorParam) {
      lastAuthErrorRef.current = null;
      return;
    }

    const message = mapAuthErrorToMessage(authErrorParam);

    if (!message) {
      lastAuthErrorRef.current = authErrorParam;
      return;
    }

    if (lastAuthErrorRef.current === authErrorParam) {
      return;
    }

    lastAuthErrorRef.current = authErrorParam;
    setError(message);
    addToast({
      title: "ไม่สามารถเชื่อม LINE",
      description: message,
      color: "danger",
      severity: "danger",
      variant: "flat",
    });
  }, [authErrorParam]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 border-b-2 border-primary mx-auto animate-spin" />
          <p className="mt-4 text-default-600 dark:text-default-400">
            กำลังตรวจสอบการเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 border-b-2 border-primary mx-auto animate-spin" />
          <p className="mt-4 text-default-600 dark:text-default-400">
            กำลังเปลี่ยนหน้า...
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // แสดง error message ที่เฉพาะเจาะจง
        setError(result.error);
      } else if (result?.ok) {
        setSuccessMessage("เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...");
        setTimeout(() => {
          setShouldRedirect(true);
        }, 1000);
      } else {
        setError("การเข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
      }
    } catch {
      // console.error("Login error:", error);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setError("");
    setSuccessMessage("");
    setIsLineLoading(true);

    try {
      await signIn("line", { callbackUrl });
    } catch {
      setError(
        "ไม่สามารถเริ่มการเข้าสู่ระบบผ่าน LINE ได้ กรุณาลองใหม่อีกครั้ง",
      );
      setIsLineLoading(false);
    }
  };

  const handleInputChange = () => {
    // ล้าง error เมื่อผู้ใช้เริ่มพิมพ์
    if (error) {
      setError("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3">
      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-4 right-4">{/* <ThemeToggle /> */}</div>

      <div className="w-full max-w-md p-6 sm:p-8">
        <Card className="rounded-3xl shadow-2xl border-0 bg-background/90 backdrop-blur-lg">
          <CardBody className="p-8">
            <div className="flex flex-col items-center mb-8">
              <Image
                priority
                alt="โรงพยาบาลราชพิพัฒน์"
                className="rounded-full bg-background"
                height={90}
                src="/images/logo.png"
                width={90}
              />
              <h1 className="mt-6 text-2xl font-extrabold text-foreground tracking-tight">
                เข้าสู่ระบบ
              </h1>
              <p className="text-default-600 dark:text-default-400 text-sm mt-1">
                {siteConfig.projectName}
              </p>
            </div>

            {/* LDAP Authentication Info */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-default-600">
                <LockClosedIcon className="w-4 h-4 text-primary" />
                <span>เข้าสู่ระบบด้วย LDAP Authentication</span>
              </div>
              <p className="text-xs text-danger-500 mt-1">
                ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับระบบ Eleaning
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <Input
                  required
                  className="focus-within:ring-2 focus-within:ring-primary"
                  isInvalid={!!error}
                  label="Username"
                  placeholder="กรอกชื่อผู้ใช้ Active Directory"
                  size="lg"
                  startContent={<UserIcon className="w-5 h-5 text-primary" />}
                  type="text"
                  value={username}
                  variant="bordered"
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleInputChange();
                  }}
                />
              </div>
              <div>
                <Input
                  required
                  className="focus-within:ring-2 focus-within:ring-primary"
                  endContent={
                    <button
                      className="focus:outline-none"
                      tabIndex={-1}
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-default-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-default-400" />
                      )}
                    </button>
                  }
                  isInvalid={!!error}
                  label="Password"
                  placeholder="กรอกรหัสผ่าน Active Directory"
                  size="lg"
                  startContent={
                    <LockClosedIcon className="w-5 h-5 text-primary" />
                  }
                  type={showPassword ? "text" : "password"}
                  value={password}
                  variant="bordered"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-danger text-sm bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="flex items-center gap-2 text-success text-sm bg-success-50 dark:bg-success-900/20 p-3 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  className="w-full font-semibold shadow-md"
                  color="primary"
                  // disabled={!username || !password}
                  isLoading={isLoading}
                  size="lg"
                  startContent={<LockClosedIcon className="w-5 h-5" />}
                  type="submit"
                >
                  {isLoading ? "กำลังตรวจสอบ LDAP..." : "เข้าสู่ระบบผ่าน LDAP"}
                </Button>

                <Button
                  className="w-full font-semibold shadow-md"
                  color="success"
                  isLoading={isLineLoading}
                  size="lg"
                  startContent={<LockClosedIcon className="w-5 h-5" />}
                  type="button"
                  variant="flat"
                  onClick={handleLineLogin}
                >
                  {isLineLoading ? "กำลังเปิด LINE..." : "เข้าสู่ระบบผ่าน LINE"}
                </Button>
              </div>
            </form>

            <div className="flex justify-between items-center mt-4 text-xs text-default-600 dark:text-default-400">
              <button
                className="flex items-center gap-1 hover:text-primary hover:bg-content2 px-2 py-1 rounded"
                type="button"
                onClick={() => router.push("/")}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                กลับหน้าหลัก
              </button>
            </div>

            <Divider className="my-6" />

            <div className="text-center text-xs text-default-500 dark:text-default-400">
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
