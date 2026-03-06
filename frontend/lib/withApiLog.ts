import type { NextRequest } from 'next/server';

import { getAuthSession } from '@/lib/auth';

type RequestLike = Request | NextRequest;

type ApiHandlerWithContext = (
  request: RequestLike,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

type ApiHandlerNoContext = (request: RequestLike) => Promise<Response> | Response;

type ApiHandler = ApiHandlerNoContext | ApiHandlerWithContext;

function getPath(request: RequestLike): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

/**
 * Wrapper สำหรับ API route handler ที่ log access (method, path, status, duration, user)
 * ไปที่ stdout ให้ PM2 หรือ log aggregator จับได้
 *
 * ใช้กับ route ที่ต้องการ log แบบละเอียด (ไม่จำเป็นต้องใช้กับทุก route เพราะ middleware log ทุก /api อยู่แล้ว)
 *
 * @example
 * // handler ไม่มี context
 * export const GET = withApiLog(async (request) => { ... });
 *
 * @example
 * // handler มี context (dynamic route)
 * export const GET = withApiLog(async (request, context) => { ... });
 */
export function withApiLog(handler: ApiHandler): ApiHandler {
  return (async (request: RequestLike, context?: { params: Promise<Record<string, string>> }) => {
    const start = Date.now();
    const method = request.method;
    const path = getPath(request);

    let user: string | null = null;
    try {
      const auth = await getAuthSession();
      if (auth.ok) user = auth.userId;
    } catch {
      // ไม่ให้การดึง session ล้มการ log
    }

    const res = await (context !== undefined
      ? (handler as ApiHandlerWithContext)(request, context)
      : (handler as ApiHandlerNoContext)(request));

    const duration = Date.now() - start;
    const status = res.status;
    console.log(`[API] ${method} ${path} ${status} ${duration}ms user=${user ?? 'anonymous'}`);

    return res;
  }) as ApiHandler;
}
