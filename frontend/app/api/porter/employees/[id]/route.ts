import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { prisma } from '@/lib/prisma';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { logger } from '@/lib/logger';
import { formatZodError } from '@/lib/schemas/porterRequest';

const UpdateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
  employmentTypeId: z.union([z.string(), z.number()]).optional(),
  positionId: z.union([z.string(), z.number()]).optional(),
  status: z.boolean().optional(),
  userId: z.string().nullable().optional(),
});

type EmployeeProtoData = {
  id: string;
  citizen_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  profile_image?: string;
  employment_type_id: string;
  position_id: string;
  status: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};

function mapEmployeeFromProto(
  data: EmployeeProtoData,
  personTypeName: string,
  positionName: string,
) {
  return {
    id: data.id,
    citizenId: data.citizen_id,
    firstName: data.first_name,
    lastName: data.last_name,
    nickname: data.nickname || undefined,
    profileImage: data.profile_image || undefined,
    employmentType: personTypeName,
    employmentTypeId: data.employment_type_id,
    position: positionName,
    positionId: data.position_id,
    status: data.status,
    userId: data.user_id || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function enrichEmployee(data: EmployeeProtoData) {
  const [personType, position] = await Promise.all([
    prisma.hrd_person_type.findUnique({
      where: { HR_PERSON_TYPE_ID: parseInt(data.employment_type_id, 10) },
      select: { HR_PERSON_TYPE_NAME: true },
    }),
    prisma.hrd_position.findUnique({
      where: { HR_POSITION_ID: parseInt(data.position_id, 10) },
      select: { HR_POSITION_NAME: true },
    }),
  ]);

  return mapEmployeeFromProto(
    data,
    personType?.HR_PERSON_TYPE_NAME || '',
    position?.HR_POSITION_NAME || '',
  );
}

/**
 * GET /api/porter/employees/[id]
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const response = await callPorterService<{
      success: boolean;
      data?: EmployeeProtoData;
      error_message?: string;
    }>('GetEmployee', { id });

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: response.error_message || 'ไม่พบข้อมูลเจ้าหน้าที่',
        },
        { status: 404 },
      );
    }

    const frontendData = await enrichEmployee(response.data);

    return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
  } catch (error) {
    return handleGrpcError(error, { context: 'GET /api/porter/employees/[id]' });
  }
}

/**
 * PUT /api/porter/employees/[id]
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;
    const protoRequest: Record<string, unknown> = { id };

    if (data.firstName !== undefined) protoRequest.first_name = data.firstName;
    if (data.lastName !== undefined) protoRequest.last_name = data.lastName;
    if (data.nickname !== undefined) protoRequest.nickname = data.nickname || undefined;
    if (data.profileImage !== undefined) {
      protoRequest.profile_image =
        data.profileImage && data.profileImage.trim() !== '' ? data.profileImage : '';
    }
    if (data.employmentTypeId !== undefined) {
      protoRequest.employment_type_id = String(data.employmentTypeId);
    }
    if (data.positionId !== undefined) {
      protoRequest.position_id = String(data.positionId);
    }
    if (data.status !== undefined) protoRequest.status = data.status;
    if (data.userId !== undefined) {
      protoRequest.user_id = data.userId && data.userId.trim() !== '' ? data.userId.trim() : '';
    }

    const response = await callPorterService<{
      success: boolean;
      data?: EmployeeProtoData;
      error_message?: string;
    }>('UpdateEmployee', protoRequest);

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'UPDATE_FAILED',
          message: response.error_message || 'ไม่สามารถอัปเดตข้อมูลเจ้าหน้าที่ได้',
        },
        { status: 400 },
      );
    }

    const frontendData = await enrichEmployee(response.data);

    return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
  } catch (error) {
    const err = error as { code?: number; message?: string; details?: string };
    const details = String(err.details ?? err.message ?? '');

    if (details.includes('USER_ALREADY_LINKED')) {
      logger.warn('PUT /api/porter/employees/[id] user already linked');

      return NextResponse.json(
        {
          success: false,
          error: 'USER_ALREADY_LINKED',
          message: 'ผู้ใช้นี้ผูกกับเจ้าหน้าที่อื่นแล้ว กรุณาเลือกผู้ใช้อื่นหรือยกเลิกการผูก',
        },
        { status: 409 },
      );
    }

    return handleGrpcError(error, { context: 'PUT /api/porter/employees/[id]' });
  }
}

/**
 * DELETE /api/porter/employees/[id]
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const response = await callPorterService<{
      success: boolean;
      message?: string;
      error_message?: string;
    }>('DeleteEmployee', { id });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'DELETE_FAILED',
          message: response.error_message || 'ไม่สามารถลบเจ้าหน้าที่ได้',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, message: response.message || 'ลบเจ้าหน้าที่สำเร็จ' },
      { status: 200 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'DELETE /api/porter/employees/[id]' });
  }
}
