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
  CreateFloorDepartmentInput,
  CreatePorterRequestInput,
  FloorDepartmentMessage,
  HealthCheckResult,
  ListBuildingsFilters,
  ListEmployeesFilters,
  ListFloorDepartmentsFilters,
  ListPorterRequestsFilters,
  PorterEmployeeMessage,
  PorterRequestMessage,
  PorterRequestUpdateMessage,
  StreamPorterRequestsRequest,
  UpdateBuildingInput,
  UpdateEmployeeInput,
  UpdateFloorDepartmentInput,
  UpdatePorterRequestInput,
  UpdatePorterRequestStatusInput,
  UpdatePorterRequestTimestampsInput,
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
  ListFloorPlansFilters,
  FloorPlanMessage,
  CreateBleStationInput,
  UpdateBleStationInput,
  ListBleStationsFilters,
  BleStationMessage
} from '../types/porter';
import { handleGrpcError } from '../utils/grpcError';

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

/** สร้าง Porter Request ใหม่ */
export const createPorterRequest = async (
  call: UnaryCall<CreatePorterRequestInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const data = await porterService.createPorterRequest(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create porter request');
  }
};

/** ดึงข้อมูล Porter Request โดย ID */
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
    handleGrpcError(callback, error, 'Failed to get porter request');
  }
};

/** ดึงรายการ Porter Request ทั้งหมด */
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
    handleGrpcError(callback, error, 'Failed to list porter requests');
  }
};

/** อัปเดตข้อมูล Porter Request */
export const updatePorterRequest = async (
  call: UnaryCall<UpdatePorterRequestInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updatePorterRequest(id, updateData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update porter request', {
      notFoundMessage: 'Porter request not found'
    });
  }
};

/** อัปเดตสถานะ Porter Request */
export const updatePorterRequestStatus = async (
  call: UnaryCall<UpdatePorterRequestStatusInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...statusData } = call.request;
    const data = await porterService.updatePorterRequestStatus(id, statusData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update porter request status', {
      notFoundMessage: 'Porter request not found'
    });
  }
};

/** อัปเดตเวลาสำคัญของ Porter Request */
export const updatePorterRequestTimestamps = async (
  call: UnaryCall<UpdatePorterRequestTimestampsInput, GrpcResponse<PorterRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterRequestMessage>>
) => {
  try {
    const { id, ...timestampData } = call.request;
    const data = await porterService.updatePorterRequestTimestamps(id, timestampData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update porter request timestamps', {
      notFoundMessage: 'Porter request not found'
    });
  }
};

/** ลบ Porter Request */
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
    handleGrpcError(callback, error, 'Failed to delete porter request', {
      notFoundMessage: 'Porter request not found'
    });
  }
};

/** Health Check */
export const healthCheck = async (
  _call: UnaryCall<Record<string, never>, HealthCheckResult>,
  callback: UnaryCallback<HealthCheckResult>
) => {
  try {
    const result = await porterService.healthCheck();
    callback(null, result);
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Service is unhealthy');
  }
};

/** Stream Porter Request updates แบบ real-time */
export const streamPorterRequests = (
  call: ServerWritableStream<StreamPorterRequestsRequest, PorterRequestUpdateMessage>
) => {
  const { status: statusFilter, urgency_level } = call.request;

  const handleCreated = (request: PorterRequestMessage) => {
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
      const streamData: PorterRequestUpdateMessage = {
        type: 0,
        request
      };

      call.write(streamData);
    } catch {
      // Silent error handling
    }
  };

  const handleUpdated = (request: PorterRequestMessage) => {
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
    } catch {
      // Silent error handling
    }
  };

  const handleStatusChanged = (request: PorterRequestMessage) => {
    try {
      call.write({
        type: 2,
        request
      });
    } catch {
      // Silent error handling
    }
  };

  const handleDeleted = (request: PorterRequestMessage) => {
    try {
      call.write({
        type: 3,
        request
      });
    } catch {
      // Silent error handling
    }
  };

  registerStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);

  call.on('cancelled', () => {
    unregisterStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);
  });

  call.on('end', () => {
    unregisterStreamHandlers(handleCreated, handleUpdated, handleStatusChanged, handleDeleted);
  });
};

// ----- Location Settings Handlers -----

export const createBuilding = async (
  call: UnaryCall<CreateBuildingInput, GrpcResponse<BuildingMessage>>,
  callback: UnaryCallback<GrpcResponse<BuildingMessage>>
) => {
  try {
    const data = await porterService.createBuilding(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create building');
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
    handleGrpcError(callback, error, 'Failed to get building');
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
    handleGrpcError(callback, error, 'Failed to list buildings');
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
    handleGrpcError(callback, error, 'Failed to update building', {
      notFoundMessage: 'Building not found'
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
    handleGrpcError(callback, error, 'Failed to delete building', {
      notFoundMessage: 'Building not found'
    });
  }
};

// ----- Floor Department Handlers -----

export const createFloorDepartment = async (
  call: UnaryCall<CreateFloorDepartmentInput, GrpcResponse<FloorDepartmentMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorDepartmentMessage>>
) => {
  try {
    const data = await porterService.createFloorDepartment(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create floor department');
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
    handleGrpcError(callback, error, 'Failed to get floor department');
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
    handleGrpcError(callback, error, 'Failed to list floor departments');
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
    handleGrpcError(callback, error, 'Failed to update floor department', {
      notFoundMessage: 'Floor department not found'
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
    handleGrpcError(callback, error, 'Failed to delete floor department', {
      notFoundMessage: 'Floor department not found'
    });
  }
};

// ===== FloorPlan Handlers =====

export const createFloorPlan = async (
  call: UnaryCall<CreateFloorPlanInput, GrpcResponse<FloorPlanMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorPlanMessage>>
) => {
  try {
    const data = await porterService.createFloorPlan(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create floor plan');
  }
};

export const getFloorPlan = async (
  call: UnaryCall<{ id: string }, GrpcResponse<FloorPlanMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorPlanMessage>>
) => {
  try {
    const data = await porterService.getFloorPlanById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Floor plan not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to get floor plan');
  }
};

export const listFloorPlans = async (
  call: UnaryCall<ListFloorPlansFilters, GrpcListResponse<FloorPlanMessage>>,
  callback: UnaryCallback<GrpcListResponse<FloorPlanMessage>>
) => {
  try {
    const result = await porterService.listFloorPlans(call.request);

    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to list floor plans');
  }
};

export const updateFloorPlan = async (
  call: UnaryCall<UpdateFloorPlanInput & { id: string }, GrpcResponse<FloorPlanMessage>>,
  callback: UnaryCallback<GrpcResponse<FloorPlanMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateFloorPlan(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update floor plan', {
      notFoundMessage: 'Floor plan not found'
    });
  }
};

export const deleteFloorPlan = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteFloorPlan(call.request.id);
    callback(null, {
      success: true,
      message: 'Floor plan deleted successfully'
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to delete floor plan', {
      notFoundMessage: 'Floor plan not found'
    });
  }
};

// ===== BleStation Handlers =====

export const createBleStation = async (
  call: UnaryCall<CreateBleStationInput, GrpcResponse<BleStationMessage>>,
  callback: UnaryCallback<GrpcResponse<BleStationMessage>>
) => {
  try {
    const data = await porterService.createBleStation(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create BLE station');
  }
};

export const getBleStation = async (
  call: UnaryCall<{ id: string }, GrpcResponse<BleStationMessage>>,
  callback: UnaryCallback<GrpcResponse<BleStationMessage>>
) => {
  try {
    const data = await porterService.getBleStationById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'BLE station not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to get BLE station');
  }
};

export const listBleStations = async (
  call: UnaryCall<ListBleStationsFilters, GrpcListResponse<BleStationMessage>>,
  callback: UnaryCallback<GrpcListResponse<BleStationMessage>>
) => {
  try {
    const result = await porterService.listBleStations(call.request);

    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to list BLE stations');
  }
};

export const updateBleStation = async (
  call: UnaryCall<UpdateBleStationInput & { id: string }, GrpcResponse<BleStationMessage>>,
  callback: UnaryCallback<GrpcResponse<BleStationMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await porterService.updateBleStation(id, updateData);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update BLE station', {
      notFoundMessage: 'BLE station not found'
    });
  }
};

export const deleteBleStation = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await porterService.deleteBleStation(call.request.id);
    callback(null, {
      success: true,
      message: 'BLE station deleted successfully'
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to delete BLE station', {
      notFoundMessage: 'BLE station not found'
    });
  }
};

// ----- Employee Management Handlers -----

export const createEmployee = async (
  call: UnaryCall<CreateEmployeeInput, GrpcResponse<PorterEmployeeMessage>>,
  callback: UnaryCallback<GrpcResponse<PorterEmployeeMessage>>
) => {
  try {
    const data = await porterService.createEmployee(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create employee', {
      uniqueConstraints: [
        { field: 'citizenId', message: 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว' }
      ]
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
    handleGrpcError(callback, error, 'Failed to get employee');
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
    handleGrpcError(callback, error, 'Failed to list employees');
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
    handleGrpcError(callback, error, 'Failed to update employee', {
      notFoundMessage: 'Employee not found'
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
    handleGrpcError(callback, error, 'Failed to delete employee', {
      notFoundMessage: 'Employee not found'
    });
  }
};

// ----- Stream helper functions -----

const registerStreamHandlers = (
  handleCreated: (request: PorterRequestMessage) => void,
  handleUpdated: (request: PorterRequestMessage) => void,
  handleStatusChanged: (request: PorterRequestMessage) => void,
  handleDeleted: (request: PorterRequestMessage) => void
) => {
  porterEventEmitter.on('porterRequestCreated', handleCreated);
  porterEventEmitter.on('porterRequestUpdated', handleUpdated);
  porterEventEmitter.on('porterRequestStatusChanged', handleStatusChanged);
  porterEventEmitter.on('porterRequestDeleted', handleDeleted);
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
};
