// ========================================
// FILE UTILITIES
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { logInfo, logError } from './logger';
import { FileInfo } from '@/types';

// ========================================
// INTERFACES
// ========================================

// Interfaces moved to @/types

// ========================================
// FILE UTILITY FUNCTIONS
// ========================================

/**
 * ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * สร้างโฟลเดอร์ถ้ายังไม่มี
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
    logInfo(`📁 Directory ensured: ${dirPath}`);
  } catch (error) {
    logError('Failed to create directory', error as Error);
    throw new Error(`ไม่สามารถสร้างโฟลเดอร์ได้: ${dirPath}`);
  }
}

/**
 * ลบไฟล์ถ้ามีอยู่
 */
export async function deleteFileIfExists(filePath: string): Promise<boolean> {
  try {
    if (await fileExists(filePath)) {
      await fs.remove(filePath);
      logInfo(`🗑️ File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logError('Failed to delete file', error as Error);
    return false;
  }
}

/**
 * คัดลอกไฟล์
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.copy(sourcePath, destPath);
    logInfo(`📋 File copied: ${sourcePath} -> ${destPath}`);
  } catch (error) {
    logError('Failed to copy file', error as Error);
    throw new Error(`ไม่สามารถคัดลอกไฟล์ได้: ${sourcePath} -> ${destPath}`);
  }
}

/**
 * ย้ายไฟล์
 */
export async function moveFile(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.move(sourcePath, destPath);
    logInfo(`📦 File moved: ${sourcePath} -> ${destPath}`);
  } catch (error) {
    logError('Failed to move file', error as Error);
    throw new Error(`ไม่สามารถย้ายไฟล์ได้: ${sourcePath} -> ${destPath}`);
  }
}

/**
 * อ่านข้อมูลไฟล์
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  try {
    const stats = await fs.stat(filePath);
    const checksum = await generateFileChecksum(filePath);
    
    return {
      name: path.basename(filePath),
      size: stats.size,
      extension: path.extname(filePath).toLowerCase(),
      mimeType: getMimeType(path.extname(filePath)),
      checksum,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    logError('Failed to get file info', error as Error);
    throw new Error(`ไม่สามารถอ่านข้อมูลไฟล์ได้: ${filePath}`);
  }
}

/**
 * สร้าง checksum ของไฟล์
 */
export async function generateFileChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash(algorithm);
    hash.update(fileBuffer);
    return hash.digest('hex');
  } catch (error) {
    logError('Failed to generate file checksum', error as Error);
    throw new Error(`ไม่สามารถสร้าง checksum ได้: ${filePath}`);
  }
}

/**
 * ตรวจสอบ MIME type ของไฟล์
 */
export function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.dbf': 'application/octet-stream',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * ตรวจสอบว่าไฟล์เป็นประเภทที่อนุญาตหรือไม่
 */
export function isAllowedFileType(filename: string, allowedExtensions: string[]): boolean {
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
}

/**
 * สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
 */
export function generateUniqueFilename(originalName: string, _directory: string): string {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${baseName}_${timestamp}_${random}${ext}`;
}

/**
 * ตรวจสอบขนาดไฟล์ - Re-export from ValidationManager
 */
export { validateFileSize } from './validationManager';

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านง่าย
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ล้างชื่อไฟล์ให้ปลอดภัย
 */
export function sanitizeFilename(filename: string): string {
  // ลบอักขระที่ไม่ปลอดภัย
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * ตรวจสอบ path traversal
 */
export function isPathTraversal(filePath: string, basePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedBasePath = path.resolve(basePath);
  
  return !resolvedPath.startsWith(resolvedBasePath);
}

/**
 * สร้าง path ที่ปลอดภัย
 */
export function createSafePath(basePath: string, ...segments: string[]): string {
  const safeSegments = segments.map(segment => sanitizeFilename(segment));
  const fullPath = path.join(basePath, ...safeSegments);
  
  if (isPathTraversal(fullPath, basePath)) {
    throw new Error('Path traversal detected');
  }
  
  return fullPath;
}

/**
 * อ่านไฟล์เป็น Buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    logError('Failed to read file as buffer', error as Error);
    throw new Error(`ไม่สามารถอ่านไฟล์ได้: ${filePath}`);
  }
}

/**
 * เขียน Buffer เป็นไฟล์
 */
export async function writeBufferToFile(buffer: Buffer, filePath: string): Promise<void> {
  try {
    await fs.writeFile(filePath, buffer);
    logInfo(`💾 Buffer written to file: ${filePath}`);
  } catch (error) {
    logError('Failed to write buffer to file', error as Error);
    throw new Error(`ไม่สามารถเขียนไฟล์ได้: ${filePath}`);
  }
}

/**
 * ตรวจสอบว่าไฟล์เป็น DBF หรือไม่
 */
export function isDBFFile(filename: string): boolean {
  return path.extname(filename).toLowerCase() === '.dbf';
}

/**
 * ตรวจสอบว่าไฟล์เป็น Excel หรือไม่
 */
export function isExcelFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.xls' || ext === '.xlsx';
}

/**
 * ตรวจสอบว่าไฟล์เป็น REP หรือไม่
 */
export function isREPFile(filename: string): boolean {
  const name = filename.toLowerCase();
  return isExcelFile(filename) && (name.includes('rep') || name.includes('result'));
}

/**
 * ตรวจสอบว่าไฟล์เป็น Statement หรือไม่
 */
export function isStatementFile(filename: string): boolean {
  const name = filename.toLowerCase();
  return isExcelFile(filename) && (name.includes('statement') || name.includes('stm'));
}

export default {
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
  isStatementFile
};
