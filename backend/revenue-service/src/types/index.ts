// ========================================
// REVENUE SERVICE TYPE DEFINITIONS
// ========================================

// ========================================
// RE-EXPORT ALL TYPES FROM MODULES
// ========================================

// Service interfaces
export * from './services';

// Database interfaces
export * from './database';

// File-related interfaces
export * from './files';

// Validation interfaces
export * from './validation';

// Batch-related interfaces
export * from './batch';

// Authentication interfaces
export * from './auth';

// Common/utility interfaces
export * from './common';

// DBF interfaces
export * from './dbf';

// Error interfaces
export * from './errors';
export { ErrorResponse, SuccessResponse, ApiResponse } from './common';

// ========================================
// ADDITIONAL TYPES FOR COMPATIBILITY
// ========================================

// All types are now properly organized and exported from their respective modules