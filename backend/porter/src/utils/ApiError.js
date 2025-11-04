/**
 * Custom API Error Class
 * ใช้สำหรับสร้าง error ที่มี status code และ message
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}
