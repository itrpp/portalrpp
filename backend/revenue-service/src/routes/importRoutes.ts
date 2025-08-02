import express from 'express';
import multer from 'multer';
import { AuthService } from '../services/authService';
import { ImportService } from '../services/importService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { join } from 'path';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { ProcessService } from '../services/processService';

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

// POST /api/import - อัปโหลดไฟล์ DBF
router.post('/', authenticateToken, upload.array('files', 20), async (req: any, res): Promise<void> => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);
    const files = req.files as any[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

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

        // บันทึกไฟล์
        const filename = `${Date.now()}_${file.originalname}`;
        const filePath = join(ipUserDir, filename);
        await writeFile(filePath, file.buffer);

        // แยกข้อมูล DBF
        const { records, schema } = ImportService.parseDBFWithSchema(file.buffer);
        const fileType = ImportService.getFileType(filename, schema);

        // บันทึกลง database
        const dbFile = await DatabaseService.saveFile(
          filename,
          file.originalname,
          file.size,
          fileType,
          schema,
          user.userId,
          user.userName,
          clientIP,
          filePath,
        );

        // บันทึก records ลง database
        await DatabaseService.saveRecords(dbFile.id, records);

        // บันทึก schema ลง database
        await DatabaseService.saveSchema(dbFile.id, schema);

        uploadedFiles.push({
          id: dbFile.id,
          filename: filename,
          originalName: file.originalname,
          size: file.size,
          status: 'completed',
          fileType,
          recordCount: records.length,
          fieldCount: schema.length,
        });

        logger.info(`อัปโหลดไฟล์ ${file.originalname} สำเร็จ`);

      } catch (error) {
        logger.error(`Error uploading file ${file.originalname}:`, error);
        uploadedFiles.push({
          originalName: file.originalname,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      message: 'Files uploaded successfully',
      uploadedFiles,
      totalFiles: files.length,
      successfulUploads: uploadedFiles.filter(f => f.status === 'completed').length,
      failedUploads: uploadedFiles.filter(f => f.status === 'error').length,
    });

  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/import/files - ดึงรายการไฟล์ที่อัปโหลด
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

// GET /api/import/file/:id - ดึงข้อมูลไฟล์เฉพาะ
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

// DELETE /api/import/file/:id - ลบไฟล์
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

// GET /api/import/status - ตรวจสอบสถานะการอัปโหลด
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
        'File validation',
        'User-specific directories',
        'IP-based organization',
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

// GET /api/import/content/:filename - ดูเนื้อหาไฟล์ DBF
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

// GET /api/import/schema/:filename - ดูโครงสร้างไฟล์ DBF
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

// GET /api/import/preview/:filename - ดูตัวอย่างข้อมูลไฟล์ DBF
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

// GET /api/import/download/:filename - ดาวน์โหลดไฟล์ DBF
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

// POST /api/import/batch-process - ประมวลผลไฟล์แบบ batch
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
