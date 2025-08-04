import express from 'express';
import multer from 'multer';
import { AuthService } from '../services/authService';
import { ImportService } from '../services/importService';
import { DatabaseService } from '../services/databaseService';
import { BatchService } from '../services/batchService';
import { ValidationService } from '../services/validationService';
import { logger } from '../utils/logger';
import { join } from 'path';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { ProcessService } from '../services/processService';
import prisma from '../config/database.js';

const router = express.Router();

// ตั้งค่า multer สำหรับการอัปโหลดไฟล์
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 20, // ไฟล์สูงสุด 20 ไฟล์
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    if (file.mimetype === 'application/octet-stream' ||
      file.originalname?.toLowerCase().endsWith('.dbf')) {
      cb(null, true);
    } else {
      cb(new Error('Only DBF files are allowed'));
    }
  },
});

// ฟังก์ชันสำหรับดึง IP address ของ client
function getClientIPAddress(request: express.Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  const realIP = request.headers['x-real-ip'];
  const cfConnectingIP = request.headers['cf-connecting-ip'];

  if (forwarded && typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  if (realIP && typeof realIP === 'string') {
    return realIP;
  }

  if (cfConnectingIP && typeof cfConnectingIP === 'string') {
    return cfConnectingIP;
  }

  return request.ip || 'unknown';
}

// Middleware สำหรับตรวจสอบ authentication
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const user = await AuthService.verifyToken(authHeader);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  (req as any).user = user;
  next();
}

// POST /api/import/batch/create - สร้าง batch ใหม่
router.post('/batch/create', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);
    const { batchName, validateOnUpload, processOnUpload, metadata } = req.body as any;

    const { batchId, batch } = await BatchService.createBatch(user, clientIP, {
      batchName,
      validateOnUpload,
      processOnUpload,
      metadata,
    });

    // บันทึก user activity
    await BatchService.logUserActivity(
      user.userId,
      user.userName,
      'create_batch',
      `Created batch ${batchId}`,
      clientIP,
      req.get('User-Agent'),
      { batchId, batchName }
    );

    res.status(201).json({
      success: true,
      message: 'สร้าง batch สำเร็จ',
      data: {
        batchId,
        batchName,
        status: batch.status,
        createdAt: batch.createdAt,
      },
    });

  } catch (error) {
    logger.error('Create batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/import/batch/:batchId/upload - อัปโหลดไฟล์ลงใน batch
router.post('/batch/:batchId/upload', authenticateToken, upload.array('files', 20), async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);
    const { batchId } = req.params;
    const files = req.files as any[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    // ตรวจสอบ batch
    const batch = await BatchService.getBatch(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.status === 'completed' || batch.status === 'failed') {
      res.status(400).json({ error: 'Cannot upload to completed or failed batch' });
      return;
    }

    // อัปเดตสถานะ batch เป็น uploading
    await BatchService.updateBatchStatus(batchId, 'uploading');

    // สร้างโฟลเดอร์สำหรับผู้ใช้
    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    await mkdir(ipUserDir, { recursive: true });

    const uploadedFiles: any[] = [];

    for (const file of files) {
      try {
        // ตรวจสอบว่าเป็นไฟล์ DBF หรือไม่
        if (!file.originalname.toLowerCase().endsWith('.dbf')) {
          uploadedFiles.push({
            originalName: file.originalname,
            status: 'error',
            error: 'Only DBF files are allowed',
          });
          continue;
        }

        // คำนวณ checksum
        const checksum = BatchService.calculateChecksum(file.buffer);

        // บันทึกไฟล์
        const filename = `${Date.now()}_${file.originalname}`;
        const filePath = join(ipUserDir, filename);
        await writeFile(filePath, file.buffer);

        // แยกข้อมูล DBF
        const { records, schema } = ImportService.parseDBFWithSchema(file.buffer);
        const fileType = ImportService.getFileType(filename, schema);

        // เพิ่มไฟล์ลงใน batch
        const fileResult = await BatchService.addFileToBatch(
          batchId,
          {
            filename,
            originalName: file.originalname,
            size: file.size,
            fileType,
            recordCount: records.length,
            fieldCount: schema.length,
            checksum,
            filePath,
            schema,
          },
          user,
          clientIP
        );

        // บันทึก records ลง database
        await DatabaseService.saveRecords(fileResult.id, records);

        // บันทึก schema ลง database
        await DatabaseService.saveSchema(fileResult.id, schema);

        // Validate ไฟล์ (ถ้าเปิดใช้งาน)
        if (batch.metadata?.validateOnUpload) {
          const validationStartTime = Date.now();

          // Validate schema
          const schemaValidation = ValidationService.validateSchema(schema, fileType);

          // Validate records
          const recordsValidation = ValidationService.validateRecords(records, schema, fileType);

          const validationTime = Date.now() - validationStartTime;

          // บันทึก validation log
          const validationRules = ValidationService['getValidationRules'](fileType);
          await ValidationService.saveValidationLog(
            fileResult.id,
            'upload_validation',
            validationRules,
            {
              isValid: schemaValidation.isValid && recordsValidation.isValid,
              errors: [...schemaValidation.errors, ...recordsValidation.errors],
              validRecords: recordsValidation.validRecords,
              invalidRecords: recordsValidation.invalidRecords,
              totalRecords: recordsValidation.totalRecords,
            },
            validationTime,
            user.userId,
            user.userName
          );

          // อัปเดตสถานะ validation
          const validationStatus = schemaValidation.isValid && recordsValidation.isValid ? 'valid' : 'invalid';
          await ValidationService.updateFileValidationStatus(
            fileResult.id,
            validationStatus,
            [...schemaValidation.errors, ...recordsValidation.errors]
          );

          // อัปเดต records validation status
          if (recordsValidation.errors.length > 0) {
            await ValidationService.updateRecordsValidationStatus(fileResult.id, recordsValidation.errors);
          }

          fileResult.validationStatus = validationStatus;
          fileResult.validationErrors = [...schemaValidation.errors, ...recordsValidation.errors].map(e => e.errorMessage);
        }

        uploadedFiles.push(fileResult);

        logger.info(`อัปโหลดไฟล์ ${file.originalname} ลงใน batch ${batchId} สำเร็จ`);

      } catch (error) {
        logger.error(`Error uploading file ${file.originalname} to batch ${batchId}:`, error);
        uploadedFiles.push({
          originalName: file.originalname,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // อัปเดตสถานะ batch
    const finalBatch = await BatchService.getBatch(batchId);
    const batchStatus = finalBatch?.uploadedFiles === finalBatch?.totalFiles ? 'completed' : 'uploading';
    await BatchService.updateBatchStatus(batchId, batchStatus);

    // บันทึก user activity
    await BatchService.logUserActivity(
      user.userId,
      user.userName,
      'upload_files',
      `Uploaded ${uploadedFiles.length} files to batch ${batchId}`,
      clientIP,
      req.get('User-Agent'),
      { batchId, fileCount: uploadedFiles.length }
    );

    res.status(200).json({
      success: true,
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        batchId,
        uploadedFiles,
        batchStatus: finalBatch,
        totalFiles: files.length,
        successfulUploads: uploadedFiles.filter(f => f.status === 'uploaded').length,
        failedUploads: uploadedFiles.filter(f => f.status === 'error').length,
      },
    });

  } catch (error) {
    logger.error('Batch upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/batch/:batchId - ดึงข้อมูล batch
router.get('/batch/:batchId', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const { batchId } = req.params;

    const batch = await BatchService.getBatch(batchId);

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'ดึงข้อมูล batch สำเร็จ',
      data: batch,
    });

  } catch (error) {
    logger.error('Get batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/batches - ดึงรายการ batch ของผู้ใช้
router.get('/batches', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;

    const batches = await BatchService.getUserBatches(user.userId);

    res.status(200).json({
      success: true,
      message: 'ดึงรายการ batch สำเร็จ',
      data: {
        batches,
        totalBatches: batches.length,
      },
    });

  } catch (error) {
    logger.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/import/batch/:batchId - ลบ batch
router.delete('/batch/:batchId', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const { batchId } = req.params;

    await BatchService.deleteBatch(batchId, user.userId);

    // บันทึก user activity
    await BatchService.logUserActivity(
      user.userId,
      user.userName,
      'delete_batch',
      `Deleted batch ${batchId}`,
      getClientIPAddress(req),
      req.get('User-Agent'),
      { batchId }
    );

    res.status(200).json({
      success: true,
      message: 'ลบ batch สำเร็จ',
      data: { batchId },
    });

  } catch (error) {
    logger.error('Delete batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/import/batch/:batchId/validate - Validate batch
router.post('/batch/:batchId/validate', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const { batchId } = req.params;
    const { validationType = 'all' } = req.body;

    const batch = await BatchService.getBatch(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    // ดึงไฟล์ทั้งหมดใน batch
    const files = await DatabaseService.getFilesByBatchId(batchId);

    const validationResults: any[] = [];

    for (const file of files) {
      try {
        const schema = file.schemas.map((s: any) => ({
          name: s.fieldName,
          type: s.fieldType,
          length: s.fieldLength,
          decimalPlaces: s.fieldDecimal,
        }));

        const records = file.records.map(r => JSON.parse(r.data));

        const validationStartTime = Date.now();

        // Validate ตามประเภทที่ระบุ
        let validationResult;
        if (validationType === 'schema' || validationType === 'all') {
          validationResult = ValidationService.validateSchema(schema, file.fileType || '');
        } else {
          validationResult = ValidationService.validateRecords(records, schema, file.fileType || '');
        }

        const validationTime = Date.now() - validationStartTime;

        // บันทึก validation log
        const validationRules = ValidationService['getValidationRules'](file.fileType || '');
        await ValidationService.saveValidationLog(
          file.id,
          validationType,
          validationRules,
          validationResult,
          validationTime,
          user.userId,
          user.userName
        );

        // อัปเดตสถานะ validation
        const validationStatus = validationResult.isValid ? 'valid' : 'invalid';
        await ValidationService.updateFileValidationStatus(
          file.id,
          validationStatus,
          validationResult.errors
        );

        // อัปเดต records validation status
        if (validationResult.errors.length > 0) {
          await ValidationService.updateRecordsValidationStatus(file.id, validationResult.errors);
        }

        validationResults.push({
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          validationType,
          totalRecords: validationResult.totalRecords,
          validRecords: validationResult.validRecords,
          invalidRecords: validationResult.invalidRecords,
          validationTime,
          status: validationStatus,
          errors: validationResult.errors,
        });

      } catch (error) {
        logger.error(`Error validating file ${file.filename}:`, error);
        validationResults.push({
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          validationType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // บันทึก user activity
    await BatchService.logUserActivity(
      user.userId,
      user.userName,
      'validate_batch',
      `Validated batch ${batchId} (${validationType})`,
      getClientIPAddress(req),
      req.get('User-Agent'),
      { batchId, validationType, fileCount: files.length }
    );

    res.status(200).json({
      success: true,
      message: 'Validate batch สำเร็จ',
      data: {
        batchId,
        validationType,
        results: validationResults,
        totalFiles: files.length,
        successfulValidations: validationResults.filter(r => r.status === 'valid').length,
        failedValidations: validationResults.filter(r => r.status === 'invalid').length,
        errorValidations: validationResults.filter(r => r.status === 'error').length,
      },
    });

  } catch (error) {
    logger.error('Validate batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/import/batch/:batchId/process - ประมวลผล batch
router.post('/batch/:batchId/process', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const { batchId } = req.params;
    const { processType = 'all' } = req.body;

    const batch = await BatchService.getBatch(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    // อัปเดตสถานะ batch เป็น processing
    await BatchService.updateBatchStatus(batchId, 'processing');

    // ดึงไฟล์ทั้งหมดใน batch
    const files = await DatabaseService.getFilesByBatchId(batchId);

    const processingResults: any[] = [];

    for (const file of files) {
      try {
        const records = file.records.map((r: any) => JSON.parse(r.data));
        const processingStartTime = Date.now();

        let processedRecords = records;
        let processingDetails = '';

        // ประมวลผลตามประเภทไฟล์
        if (file.fileType === 'ADP') {
          processedRecords = ImportService.modifyADPFieldType(records);
          processingDetails = 'แก้ไขข้อมูล ADP field (15 → 16)';
        } else if (file.fileType === 'CHT') {
          const chtResult = ProcessService.processCHTFile(records);
          processedRecords = chtResult.updatedRecords;
          processingDetails = `ประมวลผลไฟล์ CHT: ลบ SEQ ${chtResult.deletedSeqValues.size} รายการ`;
        } else if (file.fileType === 'CHA') {
          processedRecords = ProcessService.processCHAFile(records, new Set());
          processingDetails = 'ประมวลผลไฟล์ CHA: รวม TOTAL ตาม CHRGITEM=31';
        } else if (file.fileType === 'OPD') {
          processedRecords = ProcessService.processOPDFile(records);
          processingDetails = 'ประมวลผลไฟล์ OPD: อัปเดต OPTYPE และจัดรูปแบบวันที่';
        }

        const processingTime = Date.now() - processingStartTime;

        // บันทึก processing log
        await DatabaseService.saveProcessingLog(
          file.id,
          'batch',
          processingDetails,
          processedRecords.length,
          processingTime,
          'completed',
          user.userId,
          user.userName
        );

        // อัปเดตสถานะไฟล์
        await DatabaseService.updateFileStatus(file.id, 'completed');

        processingResults.push({
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          fileType: file.fileType,
          recordCount: processedRecords.length,
          processingDetails,
          processingTime,
          status: 'completed',
        });

        logger.info(`ประมวลผลไฟล์ ${file.originalName} ใน batch ${batchId} สำเร็จ`);

      } catch (error) {
        logger.error(`Error processing file ${file.filename} in batch ${batchId}:`, error);
        processingResults.push({
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          fileType: file.fileType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // อัปเดตสถานะ batch
    const finalBatch = await BatchService.getBatch(batchId);
    const batchStatus = finalBatch?.processedFiles === finalBatch?.totalFiles ? 'completed' : 'processing';
    await BatchService.updateBatchStatus(batchId, batchStatus);

    // บันทึก user activity
    await BatchService.logUserActivity(
      user.userId,
      user.userName,
      'process_batch',
      `Processed batch ${batchId} (${processType})`,
      getClientIPAddress(req),
      req.get('User-Agent'),
      { batchId, processType, fileCount: files.length }
    );

    res.status(200).json({
      success: true,
      message: 'ประมวลผล batch สำเร็จ',
      data: {
        batchId,
        processType,
        results: processingResults,
        batchStatus: finalBatch,
        totalFiles: files.length,
        successfulProcesses: processingResults.filter(r => r.status === 'completed').length,
        failedProcesses: processingResults.filter(r => r.status === 'error').length,
      },
    });

  } catch (error) {
    logger.error('Process batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/batch/:batchId/status - ดึงสถานะ batch แบบ real-time
router.get('/batch/:batchId/status', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const { batchId } = req.params;

    const batch = await BatchService.getBatch(batchId);

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'ดึงสถานะ batch สำเร็จ',
      data: {
        batchId,
        status: batch.status,
        progress: {
          upload: batch.uploadProgress,
          processing: batch.processingProgress,
        },
        stats: {
          totalFiles: batch.totalFiles,
          uploadedFiles: batch.uploadedFiles,
          processedFiles: batch.processedFiles,
          totalRecords: batch.totalRecords,
          totalSize: batch.totalSize,
        },
        timestamps: {
          uploadStartTime: batch.uploadStartTime,
          uploadEndTime: batch.uploadEndTime,
          processingStartTime: batch.processingStartTime,
          processingEndTime: batch.processingEndTime,
        },
        errorMessage: batch.errorMessage,
      },
    });

  } catch (error) {
    logger.error('Get batch status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/files - ดึงรายการไฟล์ที่อัปโหลด (backward compatibility)
router.get('/files', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;

    // ดึงข้อมูลจาก database
    const files = await DatabaseService.getUserFiles(user.userId);

    res.status(200).json({
      message: 'Files retrieved successfully',
      files: files.map((file: any) => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        status: file.status,
        fileType: file.fileType,
        recordCount: file._count.records,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      totalFiles: files.length,
    });

  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/file/:id - ดึงข้อมูลไฟล์เฉพาะ (backward compatibility)
router.get('/file/:id', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const file = await DatabaseService.getFile(id);

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // ตรวจสอบว่าเป็นไฟล์ของผู้ใช้หรือไม่
    if (file.userId !== user.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json({
      message: 'File retrieved successfully',
      file: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        status: file.status,
        fileType: file.fileType,
        schema: file.schema ? JSON.parse(file.schema) : null,
        records: file.records.map((record: any) => ({
          rowIndex: record.rowIndex,
          data: JSON.parse(record.data),
        })),
        recordCount: file.records.length,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });

  } catch (error) {
    logger.error('Get file error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/import/file/:id - ลบไฟล์ (backward compatibility)
router.delete('/file/:id', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const file = await DatabaseService.getFile(id);

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // ตรวจสอบว่าเป็นไฟล์ของผู้ใช้หรือไม่
    if (file.userId !== user.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // ลบไฟล์จาก database
    await DatabaseService.deleteFile(id);

    res.status(200).json({
      message: 'File deleted successfully',
      fileId: id,
    });

  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/status - ตรวจสอบสถานะการอัปโหลด (backward compatibility)
router.get('/status', authenticateToken, (req: any, res): void => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    res.status(200).json({
      message: 'Import service is running',
      user: user.userName,
      ipAddress: clientIP,
      timestamp: new Date().toISOString(),
      features: [
        'DBF file upload',
        'Batch upload management',
        'File validation',
        'User-specific directories',
        'IP-based organization',
        'Real-time progress tracking',
      ],
    });

  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/content/:filename - ดูเนื้อหาไฟล์ DBF (backward compatibility)
router.get('/content/:filename', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);
    const filePath = join(ipUserDir, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);

    // ใช้ ImportService เพื่อแยกข้อมูล DBF
    const { records, schema } = ImportService.parseDBFWithSchema(fileBuffer);

    res.status(200).json({
      message: 'File content retrieved successfully',
      filename,
      size: fileBuffer.length,
      schema,
      records: records.slice(0, 100), // จำกัด 100 records แรก
      totalRecords: records.length,
      fieldCount: schema.length,
    });

  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/schema/:filename - ดูโครงสร้างไฟล์ DBF (backward compatibility)
router.get('/schema/:filename', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);
    const filePath = join(ipUserDir, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);
    const { schema } = ImportService.parseDBFWithSchema(fileBuffer);

    res.status(200).json({
      message: 'Schema retrieved successfully',
      filename,
      schema,
      fieldCount: schema.length,
    });

  } catch (error) {
    logger.error('Get schema error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/preview/:filename - ดูตัวอย่างข้อมูลไฟล์ DBF (backward compatibility)
router.get('/preview/:filename', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const { limit = 10 } = req.query;
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);
    const filePath = join(ipUserDir, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);
    const { records, schema } = ImportService.parseDBFWithSchema(fileBuffer);

    const previewRecords = records.slice(0, Number(limit));

    res.status(200).json({
      message: 'Preview retrieved successfully',
      filename,
      schema,
      records: previewRecords,
      totalRecords: records.length,
      previewCount: previewRecords.length,
    });

  } catch (error) {
    logger.error('Get preview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/download/:filename - ดาวน์โหลดไฟล์ DBF (backward compatibility)
router.get('/download/:filename', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);
    const filePath = join(ipUserDir, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);

    // ส่งไฟล์กลับไป
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);

  } catch (error) {
    logger.error('Download error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/import/batch-process - ประมวลผลไฟล์แบบ batch (backward compatibility)
router.post('/batch-process', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    // สร้าง path สำหรับไฟล์ของผู้ใช้
    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);

    if (!existsSync(ipUserDir)) {
      res.status(404).json({ error: 'No files found for this user' });
      return;
    }

    // อ่านไฟล์ทั้งหมดในโฟลเดอร์
    const files = await readdir(ipUserDir);
    const dbfFiles = files.filter((file: string) => file.toLowerCase().endsWith('.dbf'));

    if (dbfFiles.length === 0) {
      res.status(404).json({ error: 'No DBF files found' });
      return;
    }

    const processedFiles: any[] = [];
    const startTime = Date.now();

    // ประมวลผลไฟล์ DBF ทั้งหมด
    for (const filename of dbfFiles) {
      try {
        const filePath = join(ipUserDir, filename);
        const fs = await import('fs/promises');
        const buffer = await fs.readFile(filePath);

        // แยกข้อมูล DBF
        const { records, schema } = ImportService.parseDBFWithSchema(buffer);

        // ตรวจสอบประเภทไฟล์
        const fileType = ImportService.getFileType(filename, schema);

        // ประมวลผลตามประเภทไฟล์
        let processingDetails = '';
        let processedRecords = records;

        if (fileType === 'ADP') {
          // แก้ไขข้อมูล ADP field (เปลี่ยนจาก 15 เป็น 16)
          processedRecords = ImportService.modifyADPFieldType(records);
          processingDetails = 'แก้ไขข้อมูล ADP field (15 → 16)';
        } else if (fileType === 'CHT') {
          // ประมวลผลไฟล์ CHT
          const chtResult = ProcessService.processCHTFile(records);
          processedRecords = chtResult.updatedRecords;
          processingDetails = `ประมวลผลไฟล์ CHT: ลบ SEQ ${chtResult.deletedSeqValues.size} รายการ`;
        } else if (fileType === 'CHA') {
          // ประมวลผลไฟล์ CHA
          processedRecords = ProcessService.processCHAFile(records, new Set());
          processingDetails = 'ประมวลผลไฟล์ CHA: รวม TOTAL ตาม CHRGITEM=31';
        } else if (fileType === 'OPD') {
          // ประมวลผลไฟล์ OPD
          processedRecords = ProcessService.processOPDFile(records);
          processingDetails = 'ประมวลผลไฟล์ OPD: อัปเดต OPTYPE และจัดรูปแบบวันที่';
        }

        processedFiles.push({
          filename,
          originalName: filename,
          size: buffer.length,
          status: 'completed',
          recordCount: processedRecords.length,
          fileType,
          processingDetails,
          userId: user.userId,
          userName: user.userName,
        });

        logger.info(`ประมวลผลไฟล์ ${filename} สำเร็จ: ${processingDetails}`);

      } catch (error) {
        logger.error(`Error processing file ${filename}:`, error);
        processedFiles.push({
          filename,
          originalName: filename,
          size: 0,
          status: 'error',
          recordCount: 0,
          fileType: 'unknown',
          processingDetails: '',
          userId: user.userId,
          userName: user.userName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    res.status(200).json({
      message: 'Batch processing completed successfully',
      files: processedFiles,
      totalProcessed: processedFiles.length,
      processingTime,
      successfulProcesses: processedFiles.filter(f => f.status === 'completed').length,
      failedProcesses: processedFiles.filter(f => f.status === 'error').length,
      userDir: ipUserDir,
      userId: user.userId,
      userName: user.userName,
    });

  } catch (error) {
    logger.error('Batch process error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 
