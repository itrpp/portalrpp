import * as porterService from '../services/porter.service.js';

/**
 * gRPC Handlers สำหรับ Porter Service
 * Handler layer ที่รับ request, เรียก service, และส่ง response กลับ
 */

/**
 * สร้าง Porter Request ใหม่
 */
export const createPorterRequest = async (call, callback) => {
  try {
    const data = await porterService.createPorterRequest(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error creating porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create porter request',
    });
  }
};

/**
 * ดึงข้อมูล Porter Request โดย ID
 */
export const getPorterRequest = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getPorterRequestById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get porter request',
    });
  }
};

/**
 * ดึงรายการ Porter Request ทั้งหมด
 */
export const listPorterRequests = async (call, callback) => {
  try {
    const result = await porterService.listPorterRequests(call.request);

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing porter requests:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list porter requests',
    });
  }
};

/**
 * อัปเดตข้อมูล Porter Request
 */
export const updatePorterRequest = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updatePorterRequest(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error updating porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update porter request',
    });
  }
};

/**
 * อัปเดตสถานะ Porter Request
 */
export const updatePorterRequestStatus = async (call, callback) => {
  try {
    const { id, ...statusData } = call.request;

    const data = await porterService.updatePorterRequestStatus(id, statusData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error updating porter request status:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update porter request status',
    });
  }
};

/**
 * ลบ Porter Request
 */
export const deletePorterRequest = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deletePorterRequest(id);

    callback(null, {
      success: true,
      message: 'Porter request deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error deleting porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete porter request',
    });
  }
};

/**
 * Health Check
 */
export const healthCheck = async (call, callback) => {
  try {
    const result = await porterService.healthCheck();

    callback(null, result);
  } catch (error) {
    callback({
      code: 13, // INTERNAL
      message: 'Service is unhealthy',
    });
  }
};
