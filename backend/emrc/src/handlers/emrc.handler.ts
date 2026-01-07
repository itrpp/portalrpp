import type {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream
} from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as emrcService from '../services/emrc.service';
import emrcEventEmitter from '../utils/eventEmitter';
import {
  AmbulanceRequestMessage,
  CreateAmbulanceRequestInput,
  HealthCheckResult,
  ListAmbulanceRequestsFilters,
  StreamAmbulanceRequestsRequest,
  UpdateAmbulanceRequestInput,
  UpdateAmbulanceRequestStatusInput,
  UpdateAmbulanceRequestTimestampsInput,
  AmbulanceRequestUpdateMessage
} from '../types/emrc';
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

/** สร้าง Ambulance Request ใหม่ */
export const createAmbulanceRequest = async (
  call: UnaryCall<CreateAmbulanceRequestInput, GrpcResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<AmbulanceRequestMessage>>
) => {
  try {
    const data = await emrcService.createAmbulanceRequest(call.request);
    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to create ambulance request');
  }
};

/** ดึงข้อมูล Ambulance Request โดย ID */
export const getAmbulanceRequest = async (
  call: UnaryCall<{ id: string }, GrpcResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<AmbulanceRequestMessage>>
) => {
  try {
    const data = await emrcService.getAmbulanceRequestById(call.request.id);

    if (!data) {
      callback({
        code: status.NOT_FOUND,
        message: 'Ambulance request not found'
      });
      return;
    }

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to get ambulance request');
  }
};

/** ดึงรายการ Ambulance Request ทั้งหมด */
export const listAmbulanceRequests = async (
  call: UnaryCall<ListAmbulanceRequestsFilters, GrpcListResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcListResponse<AmbulanceRequestMessage>>
) => {
  try {
    const result = await emrcService.listAmbulanceRequests(call.request);

    callback(null, {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      page_size: result.page_size
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to list ambulance requests');
  }
};

/** อัปเดตข้อมูล Ambulance Request */
export const updateAmbulanceRequest = async (
  call: UnaryCall<UpdateAmbulanceRequestInput, GrpcResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<AmbulanceRequestMessage>>
) => {
  try {
    const { id, ...updateData } = call.request;
    const data = await emrcService.updateAmbulanceRequest(id, updateData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update ambulance request', {
      notFoundMessage: 'Ambulance request not found'
    });
  }
};

/** อัปเดตสถานะ Ambulance Request */
export const updateAmbulanceRequestStatus = async (
  call: UnaryCall<UpdateAmbulanceRequestStatusInput, GrpcResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<AmbulanceRequestMessage>>
) => {
  try {
    const { id, ...statusData } = call.request;
    const data = await emrcService.updateAmbulanceRequestStatus(id, statusData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update ambulance request status', {
      notFoundMessage: 'Ambulance request not found'
    });
  }
};

/** อัปเดตเวลาสำคัญของ Ambulance Request */
export const updateAmbulanceRequestTimestamps = async (
  call: UnaryCall<UpdateAmbulanceRequestTimestampsInput, GrpcResponse<AmbulanceRequestMessage>>,
  callback: UnaryCallback<GrpcResponse<AmbulanceRequestMessage>>
) => {
  try {
    const { id, ...timestampData } = call.request;
    const data = await emrcService.updateAmbulanceRequestTimestamps(id, timestampData);

    callback(null, { success: true, data });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to update ambulance request timestamps', {
      notFoundMessage: 'Ambulance request not found'
    });
  }
};

/** ลบ Ambulance Request */
export const deleteAmbulanceRequest = async (
  call: UnaryCall<{ id: string }, GrpcDeleteResponse>,
  callback: UnaryCallback<GrpcDeleteResponse>
) => {
  try {
    await emrcService.deleteAmbulanceRequest(call.request.id);
    callback(null, {
      success: true,
      message: 'Ambulance request deleted successfully'
    });
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Failed to delete ambulance request', {
      notFoundMessage: 'Ambulance request not found'
    });
  }
};

/** Health Check */
export const healthCheck = async (
  _call: UnaryCall<Record<string, never>, HealthCheckResult>,
  callback: UnaryCallback<HealthCheckResult>
) => {
  try {
    const result = await emrcService.healthCheck();
    callback(null, result);
  } catch (error: unknown) {
    handleGrpcError(callback, error, 'Service is unhealthy');
  }
};

/** Stream Ambulance Request updates แบบ real-time */
export const streamAmbulanceRequests = (
  call: ServerWritableStream<StreamAmbulanceRequestsRequest, AmbulanceRequestUpdateMessage>
) => {
  const { status: statusFilter, booking_purpose } = call.request;

  const handleCreated = (request: AmbulanceRequestMessage) => {
    if (statusFilter !== undefined && statusFilter !== null && request.status !== statusFilter) {
      return;
    }

    if (
      booking_purpose !== undefined &&
      booking_purpose !== null &&
      request.booking_purpose !== booking_purpose
    ) {
      return;
    }

    try {
      const streamData: AmbulanceRequestUpdateMessage = {
        type: 'CREATED',
        request
      };

      call.write(streamData);
    } catch {
      // Silent error handling
    }
  };

  const handleUpdated = (request: AmbulanceRequestMessage) => {
    if (statusFilter !== undefined && statusFilter !== null && request.status !== statusFilter) {
      return;
    }
    if (
      booking_purpose !== undefined &&
      booking_purpose !== null &&
      request.booking_purpose !== booking_purpose
    ) {
      return;
    }

    try {
      call.write({
        type: 'UPDATED',
        request
      });
    } catch {
      // Silent error handling
    }
  };

  const handleStatusChanged = (request: AmbulanceRequestMessage) => {
    try {
      call.write({
        type: 'STATUS_CHANGED',
        request
      });
    } catch {
      // Silent error handling
    }
  };

  const handleDeleted = (request: AmbulanceRequestMessage) => {
    try {
      call.write({
        type: 'DELETED',
        request
      });
    } catch {
      // Silent error handling
    }
  };

  // Register event listeners
  emrcEventEmitter.on('ambulanceRequestCreated', handleCreated);
  emrcEventEmitter.on('ambulanceRequestUpdated', handleUpdated);
  emrcEventEmitter.on('ambulanceRequestStatusChanged', handleStatusChanged);
  emrcEventEmitter.on('ambulanceRequestDeleted', handleDeleted);

  const unregisterStreamHandlers = () => {
    emrcEventEmitter.off('ambulanceRequestCreated', handleCreated);
    emrcEventEmitter.off('ambulanceRequestUpdated', handleUpdated);
    emrcEventEmitter.off('ambulanceRequestStatusChanged', handleStatusChanged);
    emrcEventEmitter.off('ambulanceRequestDeleted', handleDeleted);
  };

  call.on('cancelled', () => {
    unregisterStreamHandlers();
  });

  call.on('end', () => {
    unregisterStreamHandlers();
  });
};

