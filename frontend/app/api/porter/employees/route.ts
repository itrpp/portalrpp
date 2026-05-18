import type { Prisma } from '@/generated/prisma/client';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { prisma } from '@/lib/prisma';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { logger } from '@/lib/logger';
import { formatZodError } from '@/lib/schemas/porterRequest';

type PersonTypeMapItem = Prisma.hrd_person_typeGetPayload<{
  select: { HR_PERSON_TYPE_ID: true; HR_PERSON_TYPE_NAME: true };
}>;
type PositionMapItem = Prisma.hrd_positionGetPayload<{
  select: { HR_POSITION_ID: true; HR_POSITION_NAME: true };
}>;

const ListEmployeesQuerySchema = z.object({
  employment_type_id: z.string().optional(),
  position_id: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional(),
  page_size: z.string().optional(),
});

const CreateEmployeeSchema = z.object({
  citizenId: z.string().min(1, 'กรุณาระบุเลขบัตรประชาชน'),
  firstName: z.string().min(1, 'กรุณาระบุชื่อ'),
  lastName: z.string().min(1, 'กรุณาระบุนามสกุล'),
  nickname: z.string().optional(),
  profileImage: z.string().nullable().optional(),
  employmentTypeId: z.union([z.string(), z.number()]),
  positionId: z.union([z.string(), z.number()]),
  status: z.boolean().optional().default(true),
  userId: z.string().optional(),
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

/**
 * GET /api/porter/employees
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsed = ListEmployeesQuerySchema.safeParse(Object.fromEntries(url.searchParams));

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const query = parsed.data;
    const protoRequest: Record<string, unknown> = {
      page_size: query.page_size ? parseInt(query.page_size, 10) : 1000,
    };

    if (query.employment_type_id) protoRequest.employment_type_id = query.employment_type_id;
    if (query.position_id) protoRequest.position_id = query.position_id;
    if (query.status !== undefined) {
      protoRequest.status = query.status === 'true' || query.status === '1';
    }
    if (query.page) protoRequest.page = parseInt(query.page, 10);

    const response = await callPorterService<{
      success: boolean;
      data?: EmployeeProtoData[];
      total?: number;
      page?: number;
      page_size?: number;
      error_message?: string;
    }>('ListEmployees', protoRequest);

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'FETCH_FAILED',
          message: response.error_message || 'ไม่สามารถดึงข้อมูลได้',
        },
        { status: 400 },
      );
    }

    const [personTypes, positions] = await Promise.all([
      prisma.hrd_person_type.findMany({
        select: { HR_PERSON_TYPE_ID: true, HR_PERSON_TYPE_NAME: true },
      }),
      prisma.hrd_position.findMany({
        select: { HR_POSITION_ID: true, HR_POSITION_NAME: true },
      }),
    ]);

    const personTypeMap = new Map<number, string>(
      personTypes.map((pt: PersonTypeMapItem) => [
        pt.HR_PERSON_TYPE_ID,
        pt.HR_PERSON_TYPE_NAME ?? '',
      ]),
    );
    const positionMap = new Map<number, string>(
      positions.map((p: PositionMapItem) => [p.HR_POSITION_ID, p.HR_POSITION_NAME ?? '']),
    );

    const frontendData = (response.data || []).map((item) =>
      mapEmployeeFromProto(
        item,
        personTypeMap.get(parseInt(item.employment_type_id, 10)) ?? '',
        positionMap.get(parseInt(item.position_id, 10)) ?? '',
      ),
    );

    return NextResponse.json(
      {
        success: true,
        data: frontendData,
        total: response.total || frontendData.length,
        page: response.page || 1,
        page_size: response.page_size || 1000,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'GET /api/porter/employees' });
  }
}

/**
 * POST /api/porter/employees
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;
    const protoRequest = {
      citizen_id: data.citizenId,
      first_name: data.firstName,
      last_name: data.lastName,
      nickname: data.nickname || undefined,
      profile_image:
        data.profileImage && data.profileImage.trim() !== '' ? data.profileImage : '',
      employment_type_id: String(data.employmentTypeId),
      position_id: String(data.positionId),
      status: data.status,
      user_id: data.userId || undefined,
    };

    const response = await callPorterService<{
      success: boolean;
      data?: EmployeeProtoData;
      error_message?: string;
    }>('CreateEmployee', protoRequest);

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'CREATION_FAILED',
          message: response.error_message || 'ไม่สามารถสร้างเจ้าหน้าที่ได้',
        },
        { status: 400 },
      );
    }

    const [personType, position] = await Promise.all([
      prisma.hrd_person_type.findUnique({
        where: { HR_PERSON_TYPE_ID: parseInt(response.data.employment_type_id, 10) },
        select: { HR_PERSON_TYPE_NAME: true },
      }),
      prisma.hrd_position.findUnique({
        where: { HR_POSITION_ID: parseInt(response.data.position_id, 10) },
        select: { HR_POSITION_NAME: true },
      }),
    ]);

    const frontendData = mapEmployeeFromProto(
      response.data,
      personType?.HR_PERSON_TYPE_NAME || '',
      position?.HR_POSITION_NAME || '',
    );

    return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
  } catch (error) {
    const err = error as { code?: number; message?: string };

    // ALREADY_EXISTS — เลขบัตรประชาชนซ้ำ
    if (err.code === 6) {
      logger.warn('POST /api/porter/employees duplicate', { message: err.message });

      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_CITIZEN_ID',
          message: err.message || 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว',
        },
        { status: 409 },
      );
    }

    return handleGrpcError(error, { context: 'POST /api/porter/employees' });
  }
}
