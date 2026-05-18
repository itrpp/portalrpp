import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

interface GrpcLikeError {
  code?: number;
  message?: string;
  details?: string;
}

const GRPC_ERROR_MAP: Record<
  number,
  { status: number; error: string; defaultMessage: string }
> = {
  3: { status: 400, error: 'INVALID_ARGUMENT', defaultMessage: 'ข้อมูลไม่ถูกต้อง' },
  5: { status: 404, error: 'NOT_FOUND', defaultMessage: 'ไม่พบข้อมูลที่ต้องการ' },
  14: {
    status: 503,
    error: 'PORTER_SERVICE_UNAVAILABLE',
    defaultMessage: 'บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้',
  },
};

/**
 * แปลง gRPC error → NextResponse JSON
 * รวม pattern err.code === 14 / 5 / 3 ที่ซ้ำใน API routes
 */
export function handleGrpcError(
  error: unknown,
  options?: { context?: string; headers?: HeadersInit },
): NextResponse {
  const err = (error ?? {}) as GrpcLikeError;
  const context = options?.context ?? 'api';
  const headers = options?.headers;

  logger.error(`[${context}] gRPC error`, { code: err.code, message: err.message });

  const mapped = err.code !== undefined ? GRPC_ERROR_MAP[err.code] : undefined;

  if (mapped) {
    return NextResponse.json(
      {
        success: false,
        error: mapped.error,
        message: err.message ?? mapped.defaultMessage,
      },
      { status: mapped.status, headers },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message ?? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    },
    { status: 500, headers },
  );
}
