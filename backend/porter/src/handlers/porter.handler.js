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
 * อัปเดต Timestamps ของ Porter Request
 */
export const updatePorterRequestTimestamps = async (call, callback) => {
  try {
    const { id, ...timestampData } = call.request;

    const data = await porterService.updatePorterRequestTimestamps(id, timestampData);

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

    console.error('Error updating porter request timestamps:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update porter request timestamps',
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
  } catch (_error) {
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

  console.info('[gRPC Handler] Stream request received with filters:', {
    status,
    urgency_level,
    hasStatusFilter: status !== undefined && status !== null,
    hasUrgencyFilter: urgency_level !== undefined && urgency_level !== null,
  });

  // สร้าง event handler สำหรับแต่ละ event type
  const handleCreated = (request) => {
    console.info('[gRPC Handler] handleCreated called:', {
      requestId: request.id,
      requestStatus: request.status,
      filterStatus: status,
      requestUrgencyLevel: request.urgency_level,
      filterUrgencyLevel: urgency_level,
    });

    // ตรวจสอบว่า request ตรงกับ filter หรือไม่
    // ถ้ามี filter status และไม่ตรงกัน ให้ filter ออก
    if (status !== undefined && status !== null && request.status !== status) {
      console.info('[gRPC Handler] Filtered out by status:', {
        requestStatus: request.status,
        filterStatus: status,
      });
      return;
    }

    // ตรวจสอบ urgency_level filter
    if (urgency_level !== undefined && urgency_level !== null && request.urgency_level !== urgency_level) {
      console.info('[gRPC Handler] Filtered out by urgency_level:', {
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
      
      console.info('[gRPC Handler] Writing CREATED update to stream:', {
        requestId: request.id,
        requestStatus: request.status,
      });
      
      call.write(streamData);
      console.info('[gRPC Handler] Successfully written CREATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing to stream:', {
        error: error.message,
        stack: error.stack,
        requestId: request.id,
      });
    }
  };

  const handleUpdated = (request) => {
    console.info('[gRPC Handler] handleUpdated called:', request.id);
    
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
      console.info('[gRPC Handler] Written UPDATED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing UPDATED to stream:', error);
    }
  };

  const handleStatusChanged = (request) => {
    console.info('[gRPC Handler] handleStatusChanged called:', {
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
      console.info('[gRPC Handler] Written STATUS_CHANGED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing STATUS_CHANGED to stream:', error);
    }
  };

  const handleDeleted = (request) => {
    console.info('[gRPC Handler] handleDeleted called:', request.id);
    
    try {
      call.write({
        type: 3, // DELETED
        request,
      });
      console.info('[gRPC Handler] Written DELETED update to stream:', request.id);
    } catch (error) {
      console.error('[gRPC Handler] Error writing DELETED to stream:', error);
    }
  };

  // ลงทะเบียน event listeners
  console.info('[gRPC Handler] Registering event listeners for stream');
  
  // ตรวจสอบจำนวน listeners ก่อน register
  const listenersBefore = {
    created: porterEventEmitter.listenerCount('porterRequestCreated'),
    updated: porterEventEmitter.listenerCount('porterRequestUpdated'),
    statusChanged: porterEventEmitter.listenerCount('porterRequestStatusChanged'),
    deleted: porterEventEmitter.listenerCount('porterRequestDeleted'),
  };
  console.info('[gRPC Handler] Listeners count before registration:', listenersBefore);
  
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
  console.info('[gRPC Handler] Listeners count after registration:', listenersAfter);
  console.info('[gRPC Handler] Event listeners registered, waiting for events...');

  // เมื่อ client ปิด connection ให้ลบ event listeners
  call.on('cancelled', () => {
    console.info('[gRPC Handler] Stream cancelled, removing event listeners');
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
    console.info('[gRPC Handler] Listeners count after removal:', listenersAfterRemoval);
  });

  // เมื่อ stream end ให้ลบ event listeners ด้วย
  call.on('end', () => {
    console.info('[gRPC Handler] Stream ended, removing event listeners');
    porterEventEmitter.removeListener('porterRequestCreated', handleCreated);
    porterEventEmitter.removeListener('porterRequestUpdated', handleUpdated);
    porterEventEmitter.removeListener('porterRequestStatusChanged', handleStatusChanged);
    porterEventEmitter.removeListener('porterRequestDeleted', handleDeleted);
  });

  // ส่ง initial data (optional - สามารถส่งข้อมูลเริ่มต้นได้)
  // ในกรณีนี้เราจะไม่ส่ง initial data เพราะ frontend จะ fetch เอง
};

// ========================================
// LOCATION SETTINGS HANDLERS
// ========================================

/**
 * สร้าง Building ใหม่
 */
export const createBuilding = async (call, callback) => {
  try {
    const data = await porterService.createBuilding(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error creating building:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create building',
    });
  }
};

/**
 * ดึงข้อมูล Building โดย ID
 */
export const getBuilding = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getBuildingById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Building not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting building:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get building',
    });
  }
};

/**
 * ดึงรายการ Building ทั้งหมด
 */
export const listBuildings = async (call, callback) => {
  try {
    const result = await porterService.listBuildings(call.request);

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing buildings:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list buildings',
    });
  }
};

/**
 * อัปเดตข้อมูล Building
 */
export const updateBuilding = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updateBuilding(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Building not found',
      });
      return;
    }

    console.error('Error updating building:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update building',
    });
  }
};

/**
 * ลบ Building
 */
export const deleteBuilding = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deleteBuilding(id);

    callback(null, {
      success: true,
      message: 'Building deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Building not found',
      });
      return;
    }

    console.error('Error deleting building:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete building',
    });
  }
};

/**
 * สร้าง FloorDepartment ใหม่
 */
export const createFloorDepartment = async (call, callback) => {
  try {
    const data = await porterService.createFloorDepartment(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error creating floor department:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create floor department',
    });
  }
};

/**
 * ดึงข้อมูล FloorDepartment โดย ID
 */
export const getFloorDepartment = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getFloorDepartmentById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Floor department not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting floor department:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get floor department',
    });
  }
};

/**
 * ดึงรายการ FloorDepartment ทั้งหมด
 */
export const listFloorDepartments = async (call, callback) => {
  try {
    const result = await porterService.listFloorDepartments(call.request);

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing floor departments:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list floor departments',
    });
  }
};

/**
 * อัปเดตข้อมูล FloorDepartment
 */
export const updateFloorDepartment = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updateFloorDepartment(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Floor department not found',
      });
      return;
    }

    console.error('Error updating floor department:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update floor department',
    });
  }
};

/**
 * ลบ FloorDepartment
 */
export const deleteFloorDepartment = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deleteFloorDepartment(id);

    callback(null, {
      success: true,
      message: 'Floor department deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Floor department not found',
      });
      return;
    }

    console.error('Error deleting floor department:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete floor department',
    });
  }
};

// ========================================
// EMPLOYEE MANAGEMENT HANDLERS
// ========================================

/**
 * สร้าง Employee ใหม่
 */
export const createEmployee = async (call, callback) => {
  try {
    const data = await porterService.createEmployee(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    // ตรวจสอบ duplicate citizenId
    if (error.code === 'P2002' && error.meta?.target?.includes('citizenId')) {
      callback({
        code: 6, // ALREADY_EXISTS
        message: 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว',
      });
      return;
    }

    console.error('Error creating employee:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create employee',
    });
  }
};

/**
 * ดึงข้อมูล Employee โดย ID
 */
export const getEmployee = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getEmployeeById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employee not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting employee:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get employee',
    });
  }
};

/**
 * ดึงรายการ Employee ทั้งหมด
 */
export const listEmployees = async (call, callback) => {
  try {
    const result = await porterService.listEmployees(call.request);

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing employees:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list employees',
    });
  }
};

/**
 * อัปเดตข้อมูล Employee
 */
export const updateEmployee = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updateEmployee(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employee not found',
      });
      return;
    }

    console.error('Error updating employee:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update employee',
    });
  }
};

/**
 * ลบ Employee
 */
export const deleteEmployee = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deleteEmployee(id);

    callback(null, {
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employee not found',
      });
      return;
    }

    console.error('Error deleting employee:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete employee',
    });
  }
};

// ========================================
// EMPLOYMENT TYPE MANAGEMENT HANDLERS
// ========================================

/**
 * สร้าง EmploymentType ใหม่
 */
export const createEmploymentType = async (call, callback) => {
  try {
    const data = await porterService.createEmploymentType(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      callback({
        code: 6, // ALREADY_EXISTS
        message: 'ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว',
      });
      return;
    }

    console.error('Error creating employment type:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create employment type',
    });
  }
};

/**
 * ดึงข้อมูล EmploymentType โดย ID
 */
export const getEmploymentType = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getEmploymentTypeById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employment type not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting employment type:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get employment type',
    });
  }
};

/**
 * ดึงรายการ EmploymentType ทั้งหมด
 */
export const listEmploymentTypes = async (call, callback) => {
  try {
    const result = await porterService.listEmploymentTypes();

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing employment types:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list employment types',
    });
  }
};

/**
 * อัปเดตข้อมูล EmploymentType
 */
export const updateEmploymentType = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updateEmploymentType(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employment type not found',
      });
      return;
    }

    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      callback({
        code: 6, // ALREADY_EXISTS
        message: 'ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว',
      });
      return;
    }

    console.error('Error updating employment type:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update employment type',
    });
  }
};

/**
 * ลบ EmploymentType
 */
export const deleteEmploymentType = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deleteEmploymentType(id);

    callback(null, {
      success: true,
      message: 'Employment type deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Employment type not found',
      });
      return;
    }

    // ถ้ามี Employee ใช้ EmploymentType นี้อยู่ จะไม่สามารถลบได้ (Restrict)
    if (error.code === 'P2003') {
      callback({
        code: 9, // FAILED_PRECONDITION
        message: 'ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ประเภทการจ้างนี้อยู่',
      });
      return;
    }

    console.error('Error deleting employment type:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete employment type',
    });
  }
};

// ========================================
// POSITION MANAGEMENT HANDLERS
// ========================================

/**
 * สร้าง Position ใหม่
 */
export const createPosition = async (call, callback) => {
  try {
    const data = await porterService.createPosition(call.request);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      callback({
        code: 6, // ALREADY_EXISTS
        message: 'ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว',
      });
      return;
    }

    console.error('Error creating position:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create position',
    });
  }
};

/**
 * ดึงข้อมูล Position โดย ID
 */
export const getPosition = async (call, callback) => {
  try {
    const { id } = call.request;

    const data = await porterService.getPositionById(id);

    if (!data) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Position not found',
      });
      return;
    }

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting position:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get position',
    });
  }
};

/**
 * ดึงรายการ Position ทั้งหมด
 */
export const listPositions = async (call, callback) => {
  try {
    const result = await porterService.listPositions();

    callback(null, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing positions:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list positions',
    });
  }
};

/**
 * อัปเดตข้อมูล Position
 */
export const updatePosition = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    const data = await porterService.updatePosition(id, updateData);

    callback(null, {
      success: true,
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Position not found',
      });
      return;
    }

    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      callback({
        code: 6, // ALREADY_EXISTS
        message: 'ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว',
      });
      return;
    }

    console.error('Error updating position:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update position',
    });
  }
};

/**
 * ลบ Position
 */
export const deletePosition = async (call, callback) => {
  try {
    const { id } = call.request;

    await porterService.deletePosition(id);

    callback(null, {
      success: true,
      message: 'Position deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Position not found',
      });
      return;
    }

    // ถ้ามี Employee ใช้ Position นี้อยู่ จะไม่สามารถลบได้ (Restrict)
    if (error.code === 'P2003') {
      callback({
        code: 9, // FAILED_PRECONDITION
        message: 'ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ตำแหน่งนี้อยู่',
      });
      return;
    }

    console.error('Error deleting position:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete position',
    });
  }
};
