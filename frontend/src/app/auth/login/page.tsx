"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAuth } from "@/contexts/NextAuthContext";

type ProviderType = "credentials" | "ldap" | "auto";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderType>("ldap");
  const { user } = useAuth();
  const router = useRouter();

  // หากเข้าสู่ระบบแล้ว ไปหน้าแดชบอร์ด
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
      const result = await signIn(selectedProvider, {
        email: email,
        username: email, // For LDAP
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
        alert(`เข้าสู่ระบบไม่สำเร็จ: ${result.error}`);
      } else {
        alert("เข้าสู่ระบบสำเร็จ!");
        router.push("/dashboard");
      }
    } catch (error) {
      let errorMessage = "เกิดข้อผิดพลาดที่ไม่คาดคิด";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderInfo = (provider: ProviderType) => {
    switch (provider) {
      case "credentials":
        return {
          name: "บัญชีท้องถิ่น",
          description: "เข้าสู่ระบบด้วยบัญชีท้องถิ่นเท่านั้น",
          inputType: "email",
          inputPlaceholder: "อีเมล",
          inputAutoComplete: "email",
        };
      case "ldap":
        return {
          name: "LDAP",
          description: "เข้าสู่ระบบด้วย LDAP server",
          inputType: "text",
          inputPlaceholder: "ชื่อผู้ใช้",
          inputAutoComplete: "username",
        };
      case "auto":
        return {
          name: "ลองทั้งสอง",
          description:
            "ระบบจะลองเข้าสู่ระบบผ่าน LDAP ก่อน หากไม่สำเร็จจะลองบัญชีท้องถิ่น",
          inputType: "text",
          inputPlaceholder: "อีเมล/ชื่อผู้ใช้",
          inputAutoComplete: "username",
        };
      default:
        return {
          name: "ไม่ทราบ",
          description: "",
          inputType: "text",
          inputPlaceholder: "อีเมล/ชื่อผู้ใช้",
          inputAutoComplete: "username",
        };
    }
  };

  const currentProviderInfo = getProviderInfo(selectedProvider);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            เข้าสู่ระบบ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            RPP Portal - ระบบจัดการพอร์ทัลแบบ Microservices
          </p>
          <p className="mt-1 text-center text-xs text-indigo-600 font-medium">
            ปัจจุบันเลือก: {currentProviderInfo.name}
          </p>
        </div>

        {/* Provider Selector */}
        <div className="space-y-4">
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              เลือกวิธีการเข้าสู่ระบบ
            </label>
            <div className="flex justify-center mb-4">
              <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedProvider("auto")}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-colors min-w-[100px] ${
                    selectedProvider === "auto"
                      ? "bg-white text-indigo-600 shadow-sm border border-indigo-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  ลองทั้งสอง
                  {selectedProvider === "auto" && " ✓"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("credentials")}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-colors min-w-[100px] ${
                    selectedProvider === "credentials"
                      ? "bg-white text-indigo-600 shadow-sm border border-indigo-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  บัญชีท้องถิ่น
                  {selectedProvider === "credentials" && " ✓"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("ldap")}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-colors min-w-[100px] ${
                    selectedProvider === "ldap"
                      ? "bg-white text-indigo-600 shadow-sm border border-indigo-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  LDAP
                  {selectedProvider === "ldap" && " ✓"}
                </button>
              </div>
            </div>
          </div>

          {/* Provider Description */}
          <div className="text-center text-sm text-gray-600 bg-blue-50 p-4 rounded-md border border-blue-200">
            <p className="font-medium text-blue-800 text-base">
              {currentProviderInfo.name}
            </p>
            <p className="text-blue-600 mt-2">
              {currentProviderInfo.description}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {currentProviderInfo.inputPlaceholder}
              </label>
              <input
                id="email"
                name="email"
                type={currentProviderInfo.inputType}
                autoComplete={currentProviderInfo.inputAutoComplete}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={currentProviderInfo.inputPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading
                ? "กำลังเข้าสู่ระบบ..."
                : `เข้าสู่ระบบด้วย ${currentProviderInfo.name}`}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/register"
              className="text-indigo-600 hover:text-indigo-500"
            >
              ยังไม่มีบัญชี? สมัครสมาชิก
            </Link>
          </div>
        </form>

        {/* Provider Information */}
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              ข้อมูลเกี่ยวกับ Providers
            </h3>
            <div className="grid gap-3 text-xs text-gray-600">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-800">
                  🔐 บัญชีท้องถิ่น (credentials)
                </p>
                <p>ใช้บัญชีที่สร้างในระบบ RPP Portal</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-800">
                  🏢 Windows LDAP (ldap)
                </p>
                <p>ใช้บัญชีจาก Windows LDAP Server</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-800">
                  🔄 ลองทั้งสอง (auto)
                </p>
                <p>ลอง LDAP ก่อน หากไม่สำเร็จจะลองบัญชีท้องถิ่น</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">บัญชีทดสอบ:</p>
            <div className="space-y-1">
              <p>
                <strong>บัญชีท้องถิ่น:</strong>
              </p>
              <p>Admin: admin@rpp.com / password</p>
              <p>User: user@rpp.com / password</p>
              <p className="mt-2">
                <strong>Windows LDAP:</strong>
              </p>
              <p>ใช้บัญชี Windows Domain ของคุณ</p>
              <p className="text-xs text-gray-500 mt-1">
                ตัวอย่าง: username หรือ username@domain.local
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
