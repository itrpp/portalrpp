// ========================================
// UTILS INDEX - EXPORTS ALL UTILITIES
// ========================================

// Core utilities - Export everything
export * from './dateUtils';
export * from './logger';
export * from './errorHandler';
export * from './serviceManager';
export * from './fileUtils';
export * from './dataUtils';
export * from './validationManager';

// ========================================
// CONVENIENCE RE-EXPORTS
// ========================================

// Date utilities shortcuts
export {
  DateHelper,
  DateFormatter,
  DateParser,
  DateUtils,
  DATE_FORMATS,
  DATE_CONSTANTS,
  getCurrentDateFolder,
  getLogTimestamp,
  safeFromDate,
  safeToDate,
  createTimer,
  createTimestamp,
  createTimestampThailand,
  createFolderFormat,
  createFolderFormatFromDate,
  createISOString,
  createISOStringFromDate,
  createMonthYearFormat,
  createMonthYearFormatFromDate,
} from './dateUtils';

// Service management shortcuts
export {
  getServices,
  initializeServices,
  getServicesDirect,
  resetServices,
  shutdownServices,
  ServiceFactory,
} from './serviceManager';

// File utilities shortcuts
export {
  fileExists,
  ensureDirectoryExists,
  deleteFileIfExists,
  copyFile,
  moveFile,
  getFileInfo,
  generateFileChecksum,
  getMimeType,
  isAllowedFileType,
  generateUniqueFilename,
  formatFileSize,
  sanitizeFilename,
  isPathTraversal,
  createSafePath,
  readFileAsBuffer,
  writeBufferToFile,
  isDBFFile,
  isExcelFile,
  isREPFile,
  isStatementFile,
} from './fileUtils';

// Data utilities shortcuts
export {
  isValidString,
  isValidNumber,
  isValidDate,
  isValidEmail,
  isValidPhoneNumber,
  isValidHN,
  isValidAN,
  parseNumber,
  parseInteger,
  parseDate,
  formatDate,
  formatDateThai,
  parseBoolean,
  cleanString,
  cleanNumber,
  cleanDate,
  cleanHN,
  cleanAN,
  validateDBFRecord,
  validateREPRecord,
  validateStatementRecord,
  processBatch,
  safeJSONStringify,
  safeJSONParse,
  generateUniqueId,
  generateBatchId,
} from './dataUtils';

// Validation utilities shortcuts
export {
  ValidationManager,
  validateFileSize,
} from './validationManager';
