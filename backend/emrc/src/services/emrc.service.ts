import { Prisma, type AmbulanceRequest } from '@prisma/client';
import prisma from '../config/database';
import emrcEventEmitter from '../utils/eventEmitter';
import {
  mapBookingPurposeToPrisma,
  mapBookingPurposeToProto,
  mapStatusToPrisma,
  mapStatusToProto,
  mapRequiredEquipmentToPrisma,
  mapRequiredEquipmentToProto,
  mapInfectionStatusToPrisma,
  mapInfectionStatusToProto,
  mapConditionTypeToPrisma,
  mapConditionTypeToProto
} from '../utils/enumMapper';
import {
  CreateAmbulanceRequestInput,
  ListAmbulanceRequestsFilters,
  PaginationResult,
  AmbulanceRequestMessage,
  UpdateAmbulanceRequestInput,
  UpdateAmbulanceRequestStatusInput,
  UpdateAmbulanceRequestTimestampsInput,
  HealthCheckResult
} from '../types/emrc';

type AmbulanceRequestWithNames = AmbulanceRequest & {
  assignedToName?: string;
};

/** EMRC Service: รวม business logic และ database operations สำหรับ EMRC */

export const createAmbulanceRequest = async (requestData: CreateAmbulanceRequestInput): Promise<AmbulanceRequestMessage> => {
  const {
    requester_department,
    requester_name,
    requester_phone,
    requester_user_id,
    request_date,
    request_time,
    booking_purpose,
    booking_purpose_other,
    patient_name,
    patient_birth_date,
    destination_address,
    patient_rights,
    patient_hn,
    patient_citizen_id,
    patient_phone,
    required_equipment,
    infection_status,
    infection_status_other,
    department_phone,
    requester_name_detail,
    condition_type,
    acknowledged
  } = requestData;

  // แปลง requester_department เป็น number
  const requesterDepartmentValue =
    requester_department !== null && requester_department !== undefined
      ? typeof requester_department === "number"
        ? requester_department
        : Number.parseInt(String(requester_department), 10) || null
      : null;

  const createData: Prisma.AmbulanceRequestUncheckedCreateInput = {
    requesterDepartment: requesterDepartmentValue,
    requesterName: requester_name,
    requesterPhone: requester_phone,
    requesterUserID: requester_user_id,
    requestDate: request_date,
    requestTime: request_time,
    bookingPurpose: mapBookingPurposeToPrisma(booking_purpose),
    bookingPurposeOther: booking_purpose_other ?? null,
    patientName: patient_name ?? null,
    patientBirthDate: patient_birth_date ?? null,
    destinationAddress: destination_address ?? null,
    patientRights: patient_rights ?? null,
    patientHN: patient_hn ?? null,
    patientCitizenId: patient_citizen_id ?? null,
    patientPhone: patient_phone ?? null,
    requiredEquipment: required_equipment && Array.isArray(required_equipment) && required_equipment.length > 0
      ? JSON.stringify(mapRequiredEquipmentToPrisma(required_equipment))
      : JSON.stringify([]),
    infectionStatus: mapInfectionStatusToPrisma(infection_status),
    infectionStatusOther: infection_status_other ?? null,
    departmentPhone: department_phone ?? null,
    requesterNameDetail: requester_name_detail ?? null,
    conditionType: mapConditionTypeToPrisma(condition_type),
    acknowledged: acknowledged ?? false
  };

  const ambulanceRequest = await prisma.ambulanceRequest.create({ data: createData });

  // ดึงข้อมูล assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichAmbulanceRequestWithNames(ambulanceRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  emrcEventEmitter.emit('ambulanceRequestCreated', protoResponse);

  return protoResponse;
};

export const getAmbulanceRequestById = async (id: string): Promise<AmbulanceRequestMessage | null> => {
  const ambulanceRequest = await prisma.ambulanceRequest.findUnique({ where: { id } });
  if (!ambulanceRequest) return null;

  // Fetch assigned employee name
  const assignedEmployee = ambulanceRequest.assignedToId
    ? await prisma.porterEmployee.findUnique({
        where: { id: ambulanceRequest.assignedToId },
        select: { firstName: true, lastName: true }
      })
    : null;

  const requestWithNames: AmbulanceRequestWithNames = {
    ...ambulanceRequest,
    assignedToName: assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : undefined
  };

  return convertToProtoResponse(requestWithNames);
};

export const listAmbulanceRequests = async (
  filters: ListAmbulanceRequestsFilters
): Promise<PaginationResult<AmbulanceRequestMessage>> => {
  const { status, booking_purpose, requester_user_id, assigned_to_id, page = 1, page_size = 20 } = filters;

  const where: Prisma.AmbulanceRequestWhereInput = {};

  if (status !== undefined && status !== null) {
    where.status = mapStatusToPrisma(status);
  }
  if (booking_purpose !== undefined && booking_purpose !== null) {
    where.bookingPurpose = mapBookingPurposeToPrisma(booking_purpose);
  }
  if (requester_user_id) {
    where.requesterUserID = requester_user_id;
  }
  if (assigned_to_id) {
    where.assignedToId = assigned_to_id;
  }

  const skip = (page - 1) * page_size;

  const [ambulanceRequests, total] = await Promise.all([
    prisma.ambulanceRequest.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.ambulanceRequest.count({ where })
  ]);

  // Fetch all unique employee IDs
  const employeeIds = new Set<string>();
  ambulanceRequests.forEach(req => {
    if (req.assignedToId) {
      employeeIds.add(req.assignedToId);
    }
  });

  // Fetch all employees in parallel
  const employees = await prisma.porterEmployee.findMany({
    where: { id: { in: Array.from(employeeIds) } },
    select: { id: true, firstName: true, lastName: true }
  });

  // Create lookup map
  const employeeMap = new Map(
    employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])
  );

  // Enrich ambulance requests with employee names
  const requestsWithNames: AmbulanceRequestWithNames[] = ambulanceRequests.map(req => ({
    ...req,
    assignedToName: req.assignedToId ? employeeMap.get(req.assignedToId) : undefined
  }));

  return {
    data: requestsWithNames.map(convertToProtoResponse),
    total,
    page,
    page_size
  };
};

export const updateAmbulanceRequest = async (
  id: string,
  updateData: Omit<UpdateAmbulanceRequestInput, 'id'>
): Promise<AmbulanceRequestMessage> => {
  const data: Prisma.AmbulanceRequestUpdateInput = {};

  if (updateData.requester_department !== undefined) {
    const requesterDepartmentValue =
      updateData.requester_department !== null && updateData.requester_department !== undefined
        ? typeof updateData.requester_department === "number"
          ? updateData.requester_department
          : Number.parseInt(String(updateData.requester_department), 10) || null
        : null;
    data.requesterDepartment = requesterDepartmentValue;
  }
  if (updateData.requester_name) {
    data.requesterName = updateData.requester_name;
  }
  if (updateData.requester_phone) {
    data.requesterPhone = updateData.requester_phone;
  }
  if (updateData.request_date) {
    data.requestDate = updateData.request_date;
  }
  if (updateData.request_time) {
    data.requestTime = updateData.request_time;
  }
  if (updateData.booking_purpose !== undefined && updateData.booking_purpose !== null) {
    data.bookingPurpose = mapBookingPurposeToPrisma(updateData.booking_purpose);
  }
  if (updateData.booking_purpose_other !== undefined) {
    data.bookingPurposeOther = updateData.booking_purpose_other ?? null;
  }
  if (updateData.patient_name !== undefined) {
    data.patientName = updateData.patient_name ?? null;
  }
  if (updateData.patient_birth_date !== undefined) {
    data.patientBirthDate = updateData.patient_birth_date ?? null;
  }
  if (updateData.destination_address !== undefined) {
    data.destinationAddress = updateData.destination_address ?? null;
  }
  if (updateData.patient_rights !== undefined) {
    data.patientRights = updateData.patient_rights ?? null;
  }
  if (updateData.patient_hn !== undefined) {
    data.patientHN = updateData.patient_hn ?? null;
  }
  if (updateData.patient_citizen_id !== undefined) {
    data.patientCitizenId = updateData.patient_citizen_id ?? null;
  }
  if (updateData.patient_phone !== undefined) {
    data.patientPhone = updateData.patient_phone ?? null;
  }
  if (updateData.required_equipment && updateData.required_equipment.length > 0) {
    data.requiredEquipment = JSON.stringify(mapRequiredEquipmentToPrisma(updateData.required_equipment));
  }
  if (updateData.infection_status !== undefined && updateData.infection_status !== null) {
    data.infectionStatus = mapInfectionStatusToPrisma(updateData.infection_status);
  }
  if (updateData.infection_status_other !== undefined) {
    data.infectionStatusOther = updateData.infection_status_other ?? null;
  }
  if (updateData.department_phone !== undefined) {
    data.departmentPhone = updateData.department_phone ?? null;
  }
  if (updateData.requester_name_detail !== undefined) {
    data.requesterNameDetail = updateData.requester_name_detail ?? null;
  }
  if (updateData.condition_type !== undefined && updateData.condition_type !== null) {
    data.conditionType = mapConditionTypeToPrisma(updateData.condition_type);
  }
  if (updateData.acknowledged !== undefined && updateData.acknowledged !== null) {
    data.acknowledged = updateData.acknowledged;
  }

  const ambulanceRequest = await prisma.ambulanceRequest.update({
    where: { id },
    data
  });

  // ดึงข้อมูล assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichAmbulanceRequestWithNames(ambulanceRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  emrcEventEmitter.emit('ambulanceRequestUpdated', protoResponse);

  return protoResponse;
};

export const updateAmbulanceRequestStatus = async (
  id: string,
  statusData: Omit<UpdateAmbulanceRequestStatusInput, 'id'>
): Promise<AmbulanceRequestMessage> => {
  const { status, assigned_to_id, cancelled_reason, cancelled_by_id, accepted_by_id } = statusData;
  const newStatus = mapStatusToPrisma(status);

  const oldRequest = await prisma.ambulanceRequest.findUnique({ where: { id } });
  const oldStatus = oldRequest?.status;

  const data: Prisma.AmbulanceRequestUpdateInput = {
    status: newStatus
  };

  if (newStatus === 'IN_PROGRESS') {
    data.acceptedAt = new Date();
    if (accepted_by_id) {
      data.acceptedById = accepted_by_id;
    }
  } else if (newStatus === 'COMPLETED') {
    data.completedAt = new Date();
  } else if (newStatus === 'CANCELLED') {
    data.cancelledAt = new Date();
    if (cancelled_reason) {
      data.cancelledReason = cancelled_reason;
    }
    if (cancelled_by_id) {
      data.cancelledById = cancelled_by_id;
    }
  }

  if (assigned_to_id) {
    data.assignedToId = assigned_to_id;
  }

  const ambulanceRequest = await prisma.ambulanceRequest.update({
    where: { id },
    data
  });

  // ดึงข้อมูล assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichAmbulanceRequestWithNames(ambulanceRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  if (oldStatus !== newStatus) {
    emrcEventEmitter.emit('ambulanceRequestStatusChanged', protoResponse);
  } else {
    emrcEventEmitter.emit('ambulanceRequestUpdated', protoResponse);
  }

  return protoResponse;
};

export const updateAmbulanceRequestTimestamps = async (
  id: string,
  timestampData: Omit<UpdateAmbulanceRequestTimestampsInput, 'id'>
): Promise<AmbulanceRequestMessage> => {
  const { pickup_at, delivery_at, return_at } = timestampData;
  const data: Prisma.AmbulanceRequestUpdateInput = {};

  if (pickup_at !== undefined && pickup_at !== null) {
    data.pickupAt = new Date(pickup_at);
  }
  if (delivery_at !== undefined && delivery_at !== null) {
    data.deliveryAt = new Date(delivery_at);
  }
  if (return_at !== undefined && return_at !== null) {
    data.returnAt = new Date(return_at);
  }

  const ambulanceRequest = await prisma.ambulanceRequest.update({
    where: { id },
    data
  });

  // ดึงข้อมูล assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichAmbulanceRequestWithNames(ambulanceRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  emrcEventEmitter.emit('ambulanceRequestUpdated', protoResponse);

  return protoResponse;
};

export const deleteAmbulanceRequest = async (id: string): Promise<void> => {
  const ambulanceRequest = await prisma.ambulanceRequest.findUnique({ where: { id } });

  if (!ambulanceRequest) {
    return;
  }

  // ดึงข้อมูล assigned employee name ก่อนลบและส่งผ่าน stream
  const enrichedRequest = await enrichAmbulanceRequestWithNames(ambulanceRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  await prisma.ambulanceRequest.delete({ where: { id } });
  emrcEventEmitter.emit('ambulanceRequestDeleted', protoResponse);
};

export const healthCheck = async (): Promise<HealthCheckResult> => {
  await prisma.$queryRaw`SELECT 1`;
  return {
    success: true,
    message: 'EMRC service is healthy',
    timestamp: new Date().toISOString()
  };
};

// Helper functions

const enrichAmbulanceRequestWithNames = async (
  request: AmbulanceRequest
): Promise<AmbulanceRequestWithNames> => {
  const assignedEmployee = request.assignedToId
    ? await prisma.porterEmployee.findUnique({
        where: { id: request.assignedToId },
        select: { firstName: true, lastName: true }
      })
    : null;

  return {
    ...request,
    assignedToName: assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : undefined
  };
};

const convertToProtoResponse = (request: AmbulanceRequestWithNames): AmbulanceRequestMessage => {
  return {
    id: request.id,
    created_at: request.createdAt.toISOString(),
    updated_at: request.updatedAt.toISOString(),
    requester_department: request.requesterDepartment ?? undefined,
    requester_name: request.requesterName,
    requester_phone: request.requesterPhone,
    request_date: request.requestDate,
    request_time: request.requestTime,
    booking_purpose: mapBookingPurposeToProto(request.bookingPurpose),
    booking_purpose_other: request.bookingPurposeOther || undefined,
    patient_name: request.patientName || undefined,
    patient_birth_date: request.patientBirthDate || undefined,
    destination_address: request.destinationAddress || undefined,
    patient_rights: request.patientRights || undefined,
    patient_hn: request.patientHN || undefined,
    patient_citizen_id: request.patientCitizenId || undefined,
    patient_phone: request.patientPhone || undefined,
    required_equipment: mapRequiredEquipmentToProto(request.requiredEquipment as string | null),
    infection_status: mapInfectionStatusToProto(request.infectionStatus),
    infection_status_other: request.infectionStatusOther || undefined,
    department_phone: request.departmentPhone || undefined,
    requester_name_detail: request.requesterNameDetail || undefined,
    condition_type: mapConditionTypeToProto(request.conditionType),
    acknowledged: request.acknowledged,
    status: mapStatusToProto(request.status),
    assigned_to_id: request.assignedToId || undefined,
    assigned_to_name: request.assignedToName || undefined,
    accepted_at: request.acceptedAt?.toISOString() || undefined,
    accepted_by_id: request.acceptedById || undefined,
    completed_at: request.completedAt?.toISOString() || undefined,
    cancelled_at: request.cancelledAt?.toISOString() || undefined,
    cancelled_reason: request.cancelledReason || undefined,
    cancelled_by_id: request.cancelledById || undefined,
    requester_user_id: request.requesterUserID,
    pickup_at: request.pickupAt?.toISOString() || undefined,
    delivery_at: request.deliveryAt?.toISOString() || undefined,
    return_at: request.returnAt?.toISOString() || undefined
  };
};

