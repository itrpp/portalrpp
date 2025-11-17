/**
 * Async Handler Utility
 * จัดการ error ใน async route handlers โดยอัตโนมัติ
 * 
 * @param {Function} fn - Async function ที่ต้องการ wrap
 * @returns {Function} Express route handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
