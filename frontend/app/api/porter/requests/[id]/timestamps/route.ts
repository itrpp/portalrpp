import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { convertProtoToFrontend } from '@/lib/porter';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { formatZodError } from '@/lib/schemas/porterRequest';

const UpdateTimestampsSchema = z.object({
  pickupAt: z.string().nullable().optional(),
  deliveryAt: z.string().nullable().optional(),
  returnAt: z.string().nullable().optional(),
});

/**
 * PUT /api/porter/requests/[id]/timestamps
 * อัปเดต Timestamps ของ Porter Request (pickup, delivery, return)
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateTimestampsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;
    const protoRequest: Record<string, unknown> = { id };

    if (data.pickupAt) protoRequest.pickup_at = data.pickupAt;
    if (data.deliveryAt) protoRequest.delivery_at = data.deliveryAt;
    if (data.returnAt) protoRequest.return_at = data.returnAt;

    const response = await callPorterService<{
      success: boolean;
      data?: unknown;
      error_message?: string;
    }>('UpdatePorterRequestTimestamps', protoRequest);

    if (response.success) {
      const frontendData = convertProtoToFrontend(response.data);

      return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: response.error_message || 'ไม่สามารถอัปเดต Timestamps ได้',
      },
      { status: 400 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'PUT /api/porter/requests/[id]/timestamps' });
  }
}
