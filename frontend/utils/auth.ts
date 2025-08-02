import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ========================================
// AUTH UTILITIES
// ========================================

/**
 * ดึง session จาก server side
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * ตรวจสอบว่า user authenticated หรือไม่ (server side)
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * ดึงข้อมูล user จาก server side
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * ตรวจสอบ role ของ user (server side)
 */
export async function getUserRole() {
  const session = await getSession();
  return session?.user?.role || null;
}

/**
 * ตรวจสอบว่า user มี role ที่ต้องการหรือไม่ (server side)
 */
export async function hasRole(requiredRole: string) {
  const userRole = await getUserRole();
  return userRole === requiredRole;
}

/**
 * ตรวจสอบว่า user เป็น admin หรือไม่ (server side)
 */
export async function isAdmin() {
  return await hasRole('admin');
}

/**
 * ตรวจสอบว่า user เป็น user ปกติหรือไม่ (server side)
 */
export async function isUser() {
  return await hasRole('user');
} 