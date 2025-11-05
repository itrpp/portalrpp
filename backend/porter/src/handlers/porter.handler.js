import * as porterService from '../services/porter.service.js';
import porterEventEmitter from '../utils/eventEmitter.js';

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

/**
 * Stream Porter Requests - ส่งข้อมูลแบบ real-time เมื่อมีการเปลี่ยนแปลง
 */
export const streamPorterRequests = (call) => {
  const { status, urgency_level } = call.request;

  console.log('[gRPC Handler] Stream request received with filters:', {
    status,
    urgency_level,
    hasStatusFilter: status !== undefined && status !== null,
    hasUrgencyFilter: urgency_level !== undefined && urgency_level !== null,
  });

  // สร้าง event handler สำหรับแต่ละ event type
  const handleCreated = (request) => {
    console.log('[gRPC Handler] handleCreated called:', {
      requestId: request.id,
      requestStatus: request.status,
      filterStatus: status,
      requestUrgencyLevel: request.urgency_level,
      filterUrgencyLevel: urgency_level,
    });

    // ตรวจสอบว่า request ตรงกับ filter หรือไม่
    // ถ้ามี filter status และไม่ตรงกัน ให้ filter ออก
    if (status !== undefined && status !== null && request.status !== status) {
      console.log('[gRPC Handler] Filtered out by status:', {
        requestStatus: request.status,
        filterStatus: status,
      });
      return;
    }

    // ตรวจสอบ urgency_level filter
    if (urgency_level !== undefined && urgency_level !== null && request.urgency_level !== urgency_level) {
      console.log('[gRPC Handler] Filtered out by urgency_level:', {
        requestUrgencyLevel: request.urgency_level,
        filterUrgencyLevel: urgency_level,
      });
      return;
    }

    // ผ่าน filter แล้ว - ส่งข้อมูลไปยัง stream
    try {
      const streamData = {
        type: 0, // CREATED
        request,
      };
      
      console.log('[gRPC Handler] Writing CREATED update to stream:', {
        requestId: request.id,
        requestStatus: request.status,
      });
      
      call.write(streamData);
      console.log('[gRPC Handler] Successfully written CREATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing to stream:', {
        error: error.message,
        stack: error.stack,
        requestId: request.id,
      });
    }
  };

  const handleUpdated = (request) => {
    console.log('[gRPC Handler] handleUpdated called:', request.id);
    
    // ตรวจสอบ filter
    if (status !== undefined && status !== null && request.status !== status) {
      return;
    }
    if (urgency_level !== undefined && urgency_level !== null && request.urgency_level !== urgency_level) {
      return;
    }

    try {
      call.write({
        type: 1, // UPDATED
        request,
      });
      console.log('[gRPC Handler] Written UPDATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing UPDATED to stream:', error);
    }
  };

  const handleStatusChanged = (request) => {
    console.log('[gRPC Handler] handleStatusChanged called:', {
      requestId: request.id,
      requestStatus: request.status,
    });
    
    // ส่งข้อมูลเสมอเมื่อ status เปลี่ยน เพราะอาจจะเปลี่ยน tab
    // ไม่ต้อง filter เพราะ status เปลี่ยนแล้วอาจจะไปอยู่ใน tab อื่น
    try {
      call.write({
        type: 2, // STATUS_CHANGED
        request,
      });
      console.log('[gRPC Handler] Written STATUS_CHANGED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing STATUS_CHANGED to stream:', error);
    }
  };

  const handleDeleted = (request) => {
    console.log('[gRPC Handler] handleDeleted called:', request.id);
    
    try {
      call.write({
        type: 3, // DELETED
        request,
      });
      console.log('[gRPC Handler] Written DELETED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing DELETED to stream:', error);
    }
  };

  // ลงทะเบียน event listeners
  console.log('[gRPC Handler] Registering event listeners for stream');
  
  // ตรวจสอบจำนวน listeners ก่อน register
  const listenersBefore = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted'),
  };
  console.log('[gRPC Handler] Listeners count before registration:', listenersBefore);
  
  porterEventEmitter.on('porterRequestCreated', handleCreated);
  porterEventEmitter.on('porterRequestUpdated', handleUpdated);
  porterEventEmitter.on('porterRequestStatusChanged', handleStatusChanged);
  porterEventEmitter.on('porterRequestDeleted', handleDeleted);
  
  // ตรวจสอบจำนวน listeners หลัง register
  const listenersAfter = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted'),
  };
  console.log('[gRPC Handler] Listeners count after registration:', listenersAfter);
  console.log('[gRPC Handler] Event listeners registered, waiting for events...');

  // เมื่อ client ปิด connection ให้ลบ event listeners
  call.on('cancelled', () => {
    console.log('[gRPC Handler] Stream cancelled, removing event listeners');
    porterEventEmitter.removeListener('porterRequestCreated', handleCreated);
    porterEventEmitter.removeListener('porterRequestUpdated', handleUpdated);
    porterEventEmitter.removeListener('porterRequestStatusChanged', handleStatusChanged);
    porterEventEmitter.removeListener('porterRequestDeleted', handleDeleted);
    
    const listenersAfterRemoval = {
      created: porterEventEmitter.listenerCount('porterRequestCreated'),
      updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
      statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
      deleted: porterEventEmitter.listenerCount('porterRequestDeleted'),
    };
    console.log('[gRPC Handler] Listeners count after removal:', listenersAfterRemoval);
  });

  // เมื่อ stream end ให้ลบ event listeners ด้วย
  call.on('end', () => {
    console.log('[gRPC Handler] Stream ended, removing event listeners');
    porterEventEmitter.removeListener('porterRequestCreated', handleCreated);
    porterEventEmitter.removeListener('porterRequestUpdated', handleUpdated);
    porterEventEmitter.removeListener('porterRequestStatusChanged', handleStatusChanged);
    porterEventEmitter.removeListener('porterRequestDeleted', handleDeleted);
  });

  // ส่ง initial data (optional - สามารถส่งข้อมูลเริ่มต้นได้)
  // ในกรณีนี้เราจะไม่ส่ง initial data เพราะ frontend จะ fetch เอง
};
