/**
 * Porter Requests service layer
 * รวม logic การดึงรายการคำขอ + แปลง proto + เสริม cancelledByName จาก User table
 * ให้ API route ทำแค่ auth + เรียก service + ส่ง response
 */

import type {
  ListPorterRequestsError,
  ListPorterRequestsParams,
  ListPorterRequestsResult,
  PorterJobItem,
} from "@/types/porter";

import { callPorterService } from "@/lib/grpcClient";
import {
  mapStatusToProto,
  mapUrgencyLevelToProto,
  convertProtoToFrontend,
} from "@/lib/porter";
import { prisma } from "@/lib/prisma";

/**
 * สร้าง proto request object สำหรับ ListPorterRequests จาก query params
 */
export function buildListProtoRequest(
  params: ListPorterRequestsParams,
): Record<string, unknown> {
  const protoRequest: Record<string, unknown> = {};

  if (params.status !== undefined && params.status !== null) {
    protoRequest.status = mapStatusToProto(params.status);
  }
  if (params.urgency_level !== undefined && params.urgency_level !== null) {
    protoRequest.urgency_level = mapUrgencyLevelToProto(params.urgency_level);
  }
  if (params.requester_user_id) {
    protoRequest.requester_user_id = params.requester_user_id;
  }
  if (params.assigned_to_id) {
    protoRequest.assigned_to_id = params.assigned_to_id;
  }
  if (params.page) {
    protoRequest.page = parseInt(params.page, 10);
  }
  if (params.page_size) {
    protoRequest.page_size = parseInt(params.page_size, 10);
  }

  return protoRequest;
}

/**
 * เสริมรายการที่ยกเลิกด้วยชื่อผู้ยกเลิก (cancelledByName) จาก User table
 */
export async function enrichWithCancelledNames(
  items: PorterJobItem[],
): Promise<PorterJobItem[]> {
  const cancelledUserIds = items
    .filter((item) => item.status === "CANCELLED" && item.cancelledById != null)
    .map((item) => item.cancelledById as string)
    .filter((id, index, self) => self.indexOf(id) === index);

  if (cancelledUserIds.length === 0) {
    return items;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: cancelledUserIds } },
    select: { id: true, displayName: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.displayName]));

  return items.map((item) => {
    if (item.status === "CANCELLED" && item.cancelledById != null) {
      return {
        ...item,
        cancelledByName: userMap.get(item.cancelledById) ?? undefined,
      };
    }

    return item;
  });
}

/**
 * ดึงรายการ Porter requests จาก gRPC แล้วแปลงเป็น frontend format และเสริม cancelledByName
 */
export async function listPorterRequestsWithEnrichment(
  params: ListPorterRequestsParams,
): Promise<ListPorterRequestsResult | ListPorterRequestsError> {
  const protoRequest = buildListProtoRequest(params);

  const response = await callPorterService<{
    success: boolean;
    data?: unknown;
    total?: number;
    page?: number;
    page_size?: number;
    error_message?: string;
  }>("ListPorterRequests", protoRequest);

  if (!response.success) {
    return {
      success: false,
      error: "FETCH_FAILED",
      message: response.error_message ?? "ไม่สามารถดึงข้อมูลได้",
    };
  }

  const rawData = response.data ?? [];
  let frontendData: PorterJobItem[] = Array.isArray(rawData)
    ? rawData.map((item: unknown) => convertProtoToFrontend(item))
    : [];

  frontendData = await enrichWithCancelledNames(frontendData);

  return {
    success: true,
    data: frontendData,
    total: response.total ?? frontendData.length,
    page: response.page ?? 1,
    page_size: response.page_size ?? frontendData.length,
  };
}
