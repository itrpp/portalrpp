import type {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream
} from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as porterService from '../services/porter.service';
import porterEventEmitter from '../utils/eventEmitter';
import {
  BuildingMessage,
  CreateBuildingInput,
  CreateEmployeeInput,
  CreateEmploymentTypeInput,
  CreateFloorDepartmentInput,
  CreatePorterRequestInput,
  CreatePositionInput,
  EmploymentTypeMessage,
  FloorDepartmentMessage,
  HealthCheckResult,
  ListBuildingsFilters,
  ListEmployeesFilters,
  ListFloorDepartmentsFilters,
  ListPorterRequestsFilters,
  PorterEmployeeMessage,
  PorterRequestMessage,
  PorterRequestUpdateMessage,
  PositionMessage,
  StreamPorterRequestsRequest,
  UpdateBuildingInput,
  UpdateEmployeeInput,
  UpdateEmploymentTypeInput,
  UpdateFloorDepartmentInput,
  UpdatePorterRequestInput,
  UpdatePorterRequestStatusInput,
  UpdatePorterRequestTimestampsInput,
  UpdatePositionInput
} from '../types/porter';

type UnaryCall<Request, Response> = ServerUnaryCall<Request, Response>;
type UnaryCallback<Response> = sendUnaryData<Response>;

interface GrpcResponse<T> {
  success: boolean;
  data?: T;
  error_message?: string;
  message?: string;
}

interface GrpcListResponse<T> extends GrpcResponse<T[]> {
  total: number;
  page: number;
  page_size: number;
}

interface GrpcDeleteResponse {
  success: boolean;
  message?: string;
  error_message?: string;
}

/**
 * สร้าง Porter Request ใหม่
 */
export const createPorterRequest = async (
  call: UnaryCall<CreatePorterRequestInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const data = await porterService.createPorterRequest(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error creating porter request:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create porter request'
    });
  }
};

/**
 * ดึงข้อมูล Porter Request โดย ID
 */
export const getPorterRequest = async (
  call: UnaryCall<{ id: string }, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const data = await porterService.getPorterRequestById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Porter request not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting porter request:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get porter request'
    });
  }
};

/**
 * ดึงรายการ Porter Request ทั้งหมด
 */
export const listPorterRequests = async (
  call: UnaryCall<ListPorterRequestsFilters, GrpcListResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcListResponse<PorterRequestMessage>>
) => {
  try {
    const result = await porterService.listPorterRequests(call.request);

    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    console.error('Error listing porter requests:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list porter requests'
    });
  }
};

/**
 * อัปเดตข้อมูล Porter Request
 */
export const updatePorterRequest = async (
  call: UnaryCall<UpdatePorterRequestInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updatePorterRequest(id, updateData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Porter request not found'
      });
      return;
    }

    console.error('Error updating porter request:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update porter request'
    });
  }
};

/**
 * อัปเดตสถานะ Porter Request
 */
export const updatePorterRequestStatus = async (
  call: UnaryCall<UpdatePorterRequestStatusInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...statusData } = call.request;
    const data = await porterService.updatePorterRequestStatus(id, statusData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Porter request not found'
      });
      return;
    }

    console.error('Error updating porter request status:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update porter request status'
    });
  }
};

/**
 * อัปเดต Timestamps ของ Porter Request
 */
export const updatePorterRequestTimestamps = async (
  call: UnaryCall<UpdatePorterRequestTimestampsInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...timestampData } = call.request;
    const data = await porterService.updatePorterRequestTimestamps(id, timestampData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Porter request not found'
      });
      return;
    }

    console.error('Error updating porter request timestamps:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update porter request timestamps'
    });
  }
};

/**
 * ลบ Porter Request
 */
export const deletePorterRequest = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deletePorterRequest(call.request.id);
    callback(null, {
      success: true,
      message: 'Porter request deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Porter request not found'
      });
      return;
    }

    console.error('Error deleting porter request:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete porter request'
    });
  }
};

/**
 * Health Check
 */
export const healthCheck = async (
  _call: UnaryCall<Record<string, never>, HealthCheckResult>,
  callback: UnaryCallback<HealthCheckResult>
) => {
  try {
    const result = await porterService.healthCheck();
    callback(null, result);
  } catch {
    callback({
      code: status.INTERNAL,
      message: 'Service is unhealthy'
    });
  }
};

/**
 * Stream Porter Requests - ส่งข้อมูลแบบ real-time เมื่อมีการเปลี่ยนแปลง
 */
export const streamPorterRequests = (
  call: ServerWritableStream<StreamPorterRequestsRequest, PorterRequestUpdateMessage>
) => {
  const { status: statusFilter, urgency_level } = call.request;

  console.info('[gRPC Handler] Stream request received with filters:', {
    status: statusFilter,
    urgency_level,
    hasStatusFilter: statusFilter !== undefined && statusFilter !== null,
    hasUrgencyFilter: urgency_level !== undefined && urgency_level !== null
  });

  const handleCreated = (request: PorterRequestMessage) => {
    console.info('[gRPC Handler] handleCreated called:', {
      requestId: request.id,
      requestStatus: request.status,
      filterStatus: statusFilter,
      requestUrgencyLevel: request.urgency_level,
      filterUrgencyLevel: urgency_level
    });

    if (statusFilter !== undefined && statusFilter !== null && request.status !== statusFilter) {
      console.info('[gRPC Handler] Filtered out by status:', {
        requestStatus: request.status,
        filterStatus: statusFilter
      });
      return;
    }

    if (
      urgency_level !== undefined &&
      urgency_level !== null &&
      request.urgency_level !== urgency_level
    ) {
      console.info('[gRPC Handler] Filtered out by urgency_level:', {
        requestUrgencyLevel: request.urgency_level,
        filterUrgencyLevel: urgency_level
      });
      return;
    }

    try {
      const streamData: PorterRequestUpdateMessage = {
        type: 0,
        request
      };

      console.info('[gRPC Handler] Writing CREATED update to stream:', {
        requestId: request.id,
        requestStatus: request.status
      });

      call.write(streamData);
      console.info('[gRPC Handler] Successfully written CREATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing to stream:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: request.id
      });
    }
  };

  const handleUpdated = (request: PorterRequestMessage) => {
    console.info('[gRPC Handler] handleUpdated called:', request.id);

    if (statusFilter !== undefined && statusFilter !== null && request.status !== statusFilter) {
      return;
    }
    if (
      urgency_level !== undefined &&
      urgency_level !== null &&
      request.urgency_level !== urgency_level
    ) {
      return;
    }

    try {
      call.write({
        type: 1,
        request
      });
      console.info('[gRPC Handler] Written UPDATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing UPDATED to stream:', error);
    }
  };

  const handleStatusChanged = (request: PorterRequestMessage) => {
    console.info('[gRPC Handler] handleStatusChanged called:', {
      requestId: request.id,
      requestStatus: request.status
    });

    try {
      call.write({
        type: 2,
        request
      });
      console.info('[gRPC Handler] Written STATUS_CHANGED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing STATUS_CHANGED to stream:', error);
    }
  };

  const handleDeleted = (request: PorterRequestMessage) => {
    console.info('[gRPC Handler] handleDeleted called:', request.id);

    try {
      call.write({
        type: 3,
        request
      });
      console.info('[gRPC Handler] Written DELETED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing DELETED to stream:', error);
    }
  };

  registerStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);

  call.on('cancelled', () => {
    console.info('[gRPC Handler] Stream cancelled, removing event listeners');
    unregisterStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);
  });

  call.on('end', () => {
    console.info('[gRPC Handler] Stream ended, removing event listeners');
    unregisterStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);
  });
};

// ========================================
// LOCATION SETTINGS HANDLERS
// ========================================

export const createBuilding = async (
  call: UnaryCall<CreateBuildingInput, GrpcResponse<BuildingMessage>>,
  callback: UnaryCallback<GrpcResponse<BuildingMessage>>
) => {
  try {
    const data = await porterService.createBuilding(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error creating building:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create building'
    });
  }
};

export const getBuilding = async (
  call: UnaryCall<{ id: string }, GrpcResponse<BuildingMessage>>,
  callback: UnaryCallback<GrpcResponse<BuildingMessage>>
) => {
  try {
    const data = await porterService.getBuildingById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Building not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting building:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get building'
    });
  }
};

export const listBuildings = async (
  call: UnaryCall<ListBuildingsFilters, GrpcListResponse<BuildingMessage>>,
  callback: UnaryCallback<GrpcListResponse<BuildingMessage>>
) => {
  try {
    const result = await porterService.listBuildings(call.request);
    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    console.error('Error listing buildings:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list buildings'
    });
  }
};

export const updateBuilding = async (
  call: UnaryCall<UpdateBuildingInput & { id: string }, GrpcResponse<BuildingMessage>>,
  callback: UnaryCallback<GrpcResponse<BuildingMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateBuilding(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Building not found'
      });
      return;
    }

    console.error('Error updating building:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update building'
    });
  }
};

export const deleteBuilding = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteBuilding(call.request.id);
    callback(null, {
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Building not found'
      });
      return;
    }

    console.error('Error deleting building:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete building'
    });
  }
};

// ========================================
// FLOOR DEPARTMENT HANDLERS
// ========================================

export const createFloorDepartment = async (
  call: UnaryCall<CreateFloorDepartmentInput, GrpcResponse<FloorDepartmentMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorDepartmentMessage>>
) => {
  try {
    const data = await porterService.createFloorDepartment(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error creating floor department:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create floor department'
    });
  }
};

export const getFloorDepartment = async (
  call: UnaryCall<{ id: string }, GrpcResponse<FloorDepartmentMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorDepartmentMessage>>
) => {
  try {
    const data = await porterService.getFloorDepartmentById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Floor department not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting floor department:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get floor department'
    });
  }
};

export const listFloorDepartments = async (
  call: UnaryCall<ListFloorDepartmentsFilters, GrpcListResponse<FloorDepartmentMessage>>,
  callback: UnaryCallback<GrpcListResponse<FloorDepartmentMessage>>
) => {
  try {
    const result = await porterService.listFloorDepartments(call.request);
    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    console.error('Error listing floor departments:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list floor departments'
    });
  }
};

export const updateFloorDepartment = async (
  call: UnaryCall<UpdateFloorDepartmentInput & { id: string }, GrpcResponse<FloorDepartmentMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorDepartmentMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateFloorDepartment(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Floor department not found'
      });
      return;
    }

    console.error('Error updating floor department:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update floor department'
    });
  }
};

export const deleteFloorDepartment = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteFloorDepartment(call.request.id);
    callback(null, {
      success: true,
      message: 'Floor department deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Floor department not found'
      });
      return;
    }

    console.error('Error deleting floor department:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete floor department'
    });
  }
};

// ========================================
// EMPLOYEE MANAGEMENT HANDLERS
// ========================================

export const createEmployee = async (
  call: UnaryCall<CreateEmployeeInput, GrpcResponse<PorterEmployeeMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterEmployeeMessage>>
) => {
  try {
    const data = await porterService.createEmployee(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error, 'citizenId')) {
      callback({
        code: status.ALREADY_EXISTS,
        message: 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว'
      });
      return;
    }

    console.error('Error creating employee:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create employee'
    });
  }
};

export const getEmployee = async (
  call: UnaryCall<{ id: string }, GrpcResponse<PorterEmployeeMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterEmployeeMessage>>
) => {
  try {
    const data = await porterService.getEmployeeById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employee not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting employee:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get employee'
    });
  }
};

export const listEmployees = async (
  call: UnaryCall<ListEmployeesFilters, GrpcListResponse<PorterEmployeeMessage>>,
  callback: UnaryCallback<GrpcListResponse<PorterEmployeeMessage>>
) => {
  try {
    const result = await porterService.listEmployees(call.request);
    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    console.error('Error listing employees:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list employees'
    });
  }
};

export const updateEmployee = async (
  call: UnaryCall<UpdateEmployeeInput & { id: string }, GrpcResponse<PorterEmployeeMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterEmployeeMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateEmployee(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employee not found'
      });
      return;
    }

    console.error('Error updating employee:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update employee'
    });
  }
};

export const deleteEmployee = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteEmployee(call.request.id);
    callback(null, {
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employee not found'
      });
      return;
    }

    console.error('Error deleting employee:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete employee'
    });
  }
};

// ========================================
// EMPLOYMENT TYPE MANAGEMENT HANDLERS
// ========================================

export const createEmploymentType = async (
  call: UnaryCall<CreateEmploymentTypeInput, GrpcResponse<EmploymentTypeMessage>>,
  callback: UnaryCallback<GrpcResponse<EmploymentTypeMessage>>
) => {
  try {
    const data = await porterService.createEmploymentType(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error, 'name')) {
      callback({
        code: status.ALREADY_EXISTS,
        message: 'ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว'
      });
      return;
    }

    console.error('Error creating employment type:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create employment type'
    });
  }
};

export const getEmploymentType = async (
  call: UnaryCall<{ id: string }, GrpcResponse<EmploymentTypeMessage>>,
  callback: UnaryCallback<GrpcResponse<EmploymentTypeMessage>>
) => {
  try {
    const data = await porterService.getEmploymentTypeById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employment type not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting employment type:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get employment type'
    });
  }
};

export const listEmploymentTypes = async (
  _call: UnaryCall<Record<string, never>, GrpcResponse<EmploymentTypeMessage[]>>,
  callback: UnaryCallback<GrpcResponse<EmploymentTypeMessage[]>>
) => {
  try {
    const result = await porterService.listEmploymentTypes();
    callback(null, { success: true, data: result.data });
  } catch (error: unknown) {
    console.error('Error listing employment types:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list employment types'
    });
  }
};

export const updateEmploymentType = async (
  call: UnaryCall<UpdateEmploymentTypeInput & { id: string }, GrpcResponse<EmploymentTypeMessage>>,
  callback: UnaryCallback<GrpcResponse<EmploymentTypeMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateEmploymentType(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employment type not found'
      });
      return;
    }

    if (isPrismaUniqueConstraintError(error, 'name')) {
      callback({
        code: status.ALREADY_EXISTS,
        message: 'ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว'
      });
      return;
    }

    console.error('Error updating employment type:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update employment type'
    });
  }
};

export const deleteEmploymentType = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteEmploymentType(call.request.id);
    callback(null, {
      success: true,
      message: 'Employment type deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Employment type not found'
      });
      return;
    }

    if (isPrismaForeignKeyError(error)) {
      callback({
        code: status.FAILED_PRECONDITION,
        message: 'ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ประเภทการจ้างนี้อยู่'
      });
      return;
    }

    console.error('Error deleting employment type:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete employment type'
    });
  }
};

// ========================================
// POSITION MANAGEMENT HANDLERS
// ========================================

export const createPosition = async (
  call: UnaryCall<CreatePositionInput, GrpcResponse<PositionMessage>>,
  callback: UnaryCallback<GrpcResponse<PositionMessage>>
) => {
  try {
    const data = await porterService.createPosition(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error, 'name')) {
      callback({
        code: status.ALREADY_EXISTS,
        message: 'ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว'
      });
      return;
    }

    console.error('Error creating position:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to create position'
    });
  }
};

export const getPosition = async (
  call: UnaryCall<{ id: string }, GrpcResponse<PositionMessage>>,
  callback: UnaryCallback<GrpcResponse<PositionMessage>>
) => {
  try {
    const data = await porterService.getPositionById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Position not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    console.error('Error getting position:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to get position'
    });
  }
};

export const listPositions = async (
  _call: UnaryCall<Record<string, never>, GrpcResponse<PositionMessage[]>>,
  callback: UnaryCallback<GrpcResponse<PositionMessage[]>>
) => {
  try {
    const result = await porterService.listPositions();
    callback(null, { success: true, data: result.data });
  } catch (error: unknown) {
    console.error('Error listing positions:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to list positions'
    });
  }
};

export const updatePosition = async (
  call: UnaryCall<UpdatePositionInput & { id: string }, GrpcResponse<PositionMessage>>,
  callback: UnaryCallback<GrpcResponse<PositionMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updatePosition(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Position not found'
      });
      return;
    }

    if (isPrismaUniqueConstraintError(error, 'name')) {
      callback({
        code: status.ALREADY_EXISTS,
        message: 'ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว'
      });
      return;
    }

    console.error('Error updating position:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to update position'
    });
  }
};

export const deletePosition = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deletePosition(call.request.id);
    callback(null, {
      success: true,
      message: 'Position deleted successfully'
    });
  } catch (error: unknown) {
    if (isPrismaNotFoundError(error)) {
      callback({
        code: status.NOT_FOUND,
        message: 'Position not found'
      });
      return;
    }

    if (isPrismaForeignKeyError(error)) {
      callback({
        code: status.FAILED_PRECONDITION,
        message: 'ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ตำแหน่งนี้อยู่'
      });
      return;
    }

    console.error('Error deleting position:', error);
    callback({
      code: status.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to delete position'
    });
  }
};

// ========================================
// Helper functions
// ========================================

const isPrismaNotFoundError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
};

const isPrismaUniqueConstraintError = (error: unknown, fieldName: string): boolean => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 'P2002' ||
    !('meta' in error) ||
    !error.meta
  ) {
    return false;
  }

  const target = (error.meta as { target?: string | string[] }).target;

  if (!target) {
    return false;
  }

  const targets = Array.isArray(target) ? target : [target];
  return targets.includes(fieldName);
};

const isPrismaForeignKeyError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
};

const registerStreamHandlers = (
  handleCreated: (request: PorterRequestMessage) => void,
  handleUpdated: (request: PorterRequestMessage) => void,
  handleStatusChanged: (request: PorterRequestMessage) => void,
  handleDeleted: (request: PorterRequestMessage) => void
) => {
  console.info('[gRPC Handler] Registering event listeners for stream');

  const listenersBefore = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted')
  };
  console.info('[gRPC Handler] Listeners count before registration:', listenersBefore);

  porterEventEmitter.on('porterRequestCreated', handleCreated);
  porterEventEmitter.on('porterRequestUpdated', handleUpdated);
  porterEventEmitter.on('porterRequestStatusChanged', handleStatusChanged);
  porterEventEmitter.on('porterRequestDeleted', handleDeleted);

  const listenersAfter = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted')
  };
  console.info('[gRPC Handler] Listeners count after registration:', listenersAfter);
  console.info('[gRPC Handler] Event listeners registered, waiting for events...');
};

const unregisterStreamHandlers = (
  handleCreated: (request: PorterRequestMessage) => void,
  handleUpdated: (request: PorterRequestMessage) => void,
  handleStatusChanged: (request: PorterRequestMessage) => void,
  handleDeleted: (request: PorterRequestMessage) => void
) => {
  porterEventEmitter.removeListener('porterRequestCreated', handleCreated);
  porterEventEmitter.removeListener('porterRequestUpdated', handleUpdated);
  porterEventEmitter.removeListener('porterRequestStatusChanged', handleStatusChanged);
  porterEventEmitter.removeListener('porterRequestDeleted', handleDeleted);

  const listenersAfterRemoval = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted')
  };
  console.info('[gRPC Handler] Listeners count after removal:', listenersAfterRemoval);
};


