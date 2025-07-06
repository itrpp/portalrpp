"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, user } = useAuth();
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
      // เรียก login function ที่มี timeout ใน AuthContext แล้ว
      const result = await login(email, password);

      if (result.success) {
        // แสดง Alert สำเร็จ
        alert("เข้าสู่ระบบสำเร็จ!");
        router.push("/dashboard");
      } else {
        setError(result.message);
        // แสดง Alert error
        alert(`เข้าสู่ระบบไม่สำเร็จ: ${result.message}`);
      }
    } catch (error) {
      let errorMessage = "เกิดข้อผิดพลาดที่ไม่คาดคิด";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      // แสดง Alert error
      alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              เข้าสู่ระบบ
            </h2>
            <p className="text-gray-600">RPP Portal</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-red-600 text-sm">{error}</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  อีเมล
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="กรอกอีเมลของคุณ"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="กรอกรหัสผ่านของคุณ"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังเข้าสู่ระบบ...
                  </div>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                ยังไม่มีบัญชี?{" "}
                <Link
                  href="/auth/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">ข้อมูลทดสอบ:</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>อีเมล: admin@rpp.com</p>
                <p>รหัสผ่าน: password</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
