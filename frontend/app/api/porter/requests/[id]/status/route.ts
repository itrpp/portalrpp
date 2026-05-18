import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { mapStatusToProto, convertProtoToFrontend } from '@/lib/porter';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { UpdateStatusSchema, formatZodError } from '@/lib/schemas/porterRequest';

/**
 * PUT /api/porter/requests/[id]/status
 * อัปเดตสถานะ Porter Request
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;

    const protoRequest: Record<string, unknown> = {
      id,
      status: mapStatusToProto(data.status),
    };

    // ศูนย์เปลมอบหมายงาน
    if (data.assignedToId) {
      protoRequest.assigned_to_id = data.assignedToId;
      protoRequest.accepted_by_id = auth.userId;
    }
    if (data.cancelledReason) {
      protoRequest.cancelled_reason = data.cancelledReason;
      protoRequest.cancelled_by_id = auth.userId;
    }

    const response = await callPorterService<{
      success: boolean;
      data?: unknown;
      error_message?: string;
    }>('UpdatePorterRequestStatus', protoRequest);

    if (response.success) {
      const frontendData = convertProtoToFrontend(response.data);

      return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: response.error_message || 'ไม่สามารถอัปเดตสถานะได้',
      },
      { status: 400 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'PUT /api/porter/requests/[id]/status' });
  }
}
