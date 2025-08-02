import express from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthService } from '../services/authService';
import { ImportService } from '../services/importService';
import { ProcessService } from '../services/processService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { ProcessedFile } from '../types/index';

const router = express.Router();

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

// POST /api/process/all - ประมวลผลไฟล์ DBF ทั้งหมด
router.post('/all', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    logger.info('Process API called');

    const user = req.user;
    const { processByType = true } = req.body;

    // ดึงไฟล์จาก database
    const files = await DatabaseService.getUserFiles(user.userId);

    if (files.length === 0) {
      res.status(404).json({ error: 'No files found for this user' });
      return;
    }

    const processedFiles: ProcessedFile[] = [];
    const startTime = Date.now();

    if (processByType) {
      // ประมวลผลแบบเชื่อมโยงตามประเภทไฟล์
      const result = await processLinkedFilesFromDB(files, user);
      processedFiles.push(...result);
    } else {
      // ประมวลผลแบบแยกไฟล์
      for (const file of files) {
        try {
          // ดึงข้อมูลไฟล์จาก database
          const fileData = await DatabaseService.getFile(file.id);

          if (!fileData || !fileData.schema) {
            processedFiles.push({
              filename: file.filename,
              recordCount: 0,
              processingDetails: 'ไม่พบข้อมูลไฟล์',
              status: 'error',
            });
            continue;
          }

          const records = fileData.records.map((record: any) => JSON.parse(record.data));

          // ประมวลผลไฟล์
          ProcessService.processDBFFile(records, file.filename);

          // บันทึก processing log
          await DatabaseService.saveProcessingLog(
            file.id,
            'individual',
            'ประมวลผลไฟล์ DBF',
            records.length,
            Date.now() - startTime,
            'completed',
            user.userId,
            user.userName,
          );

          processedFiles.push({
            filename: file.filename,
            recordCount: records.length,
            processingDetails: 'ประมวลผลไฟล์ DBF',
            status: 'completed',
          });

          logger.info(`ประมวลผลไฟล์ ${file.filename} สำเร็จ`);

        } catch (error) {
          logger.error(`Error processing file ${file.filename}:`, error);

          // บันทึก processing log error
          await DatabaseService.saveProcessingLog(
            file.id,
            'individual',
            'ประมวลผลไฟล์ DBF',
            0,
            Date.now() - startTime,
            'error',
            user.userId,
            user.userName,
            error instanceof Error ? error.message : 'Unknown error',
          );

          processedFiles.push({
            filename: file.filename,
            recordCount: 0,
            processingDetails: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    res.status(200).json({
      message: 'Processing completed successfully',
      processedFiles,
      processingTime,
      totalFiles: files.length,
      successfulProcesses: processedFiles.filter(f => f.status === 'completed').length,
      failedProcesses: processedFiles.filter(f => f.status === 'error').length,
    });

  } catch (error) {
    logger.error('Process error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ฟังก์ชันสำหรับประมวลผลไฟล์แบบเชื่อมโยงจาก database
async function processLinkedFilesFromDB(
  files: any[],
  user: any,
): Promise<ProcessedFile[]> {
  const processedFiles: ProcessedFile[] = [];
  const deletedSeqValues = new Set<string>();
  const keptSeqValues = new Set<string>();
  const processedCHTFiles: any[] = [];
  const processedOPDFiles: any[] = [];
  const insRecords: any[] = [];

  // อ่านไฟล์ INS ก่อนเพื่อใช้ในการประมวลผลไฟล์ OPD
  for (const file of files) {
    try {
      if (file.fileType === 'INS') {
        const fileData = await DatabaseService.getFile(file.id);
        if (fileData && fileData.schema) {
          const records = fileData.records.map((record: any) => JSON.parse(record.data));
          insRecords.push(...records);
          logger.info(`อ่านไฟล์ INS: ${file.filename}, จำนวน records: ${records.length}`);
        }
      }
    } catch (error) {
      logger.error(`Error reading INS file ${file.filename}:`, error);
    }
  }

  // ประมวลผลไฟล์ตามลำดับ: CHT → CHA → INS → DRU → OPD → ADP
  const fileOrder = ['CHT', 'CHA', 'INS', 'DRU', 'OPD', 'ADP'];

  for (const fileType of fileOrder) {
    const typeFiles = files.filter(f => f.fileType === fileType);

    for (const file of typeFiles) {
      try {
        const fileData = await DatabaseService.getFile(file.id);

        if (!fileData || !fileData.schema) {
          processedFiles.push({
            filename: file.filename,
            recordCount: 0,
            processingDetails: 'ไม่พบข้อมูลไฟล์',
            status: 'error',
          });
          continue;
        }

        const schema = JSON.parse(fileData.schema);
        const records = fileData.records.map((record: any) => JSON.parse(record.data));

        let processingDetails = '';

        // ประมวลผลตามประเภทไฟล์
        if (fileType === 'CHT') {
          const chtResult = ProcessService.processCHTFile(records);
          chtResult.deletedSeqValues.forEach((seq: string) => deletedSeqValues.add(seq));

          // เก็บข้อมูลไฟล์ CHT ที่ผ่านการประมวลผลแล้ว
          processedCHTFiles.push({
            filename: file.filename,
            records: chtResult.updatedRecords,
            schema,
            deletedSeqValues: chtResult.deletedSeqValues,
          });

          processingDetails = `ประมวลผลไฟล์ CHT: ลบ SEQ ${chtResult.deletedSeqValues.size} รายการ`;

        } else if (fileType === 'CHA') {
          ProcessService.processCHAFile(records, deletedSeqValues);
          processingDetails = 'ประมวลผลไฟล์ CHA: รวม TOTAL ตาม CHRGITEM=31';

        } else if (fileType === 'INS') {
          ProcessService.processINSFile(records, deletedSeqValues);
          processingDetails = 'ประมวลผลไฟล์ INS: ลบ records ที่มี SEQ ตามที่ถูกลบออกจาก CHT';

        } else if (fileType === 'DRU') {
          // รวบรวม kept SEQ จากไฟล์ CHT
          processedCHTFiles.forEach(chtFile => {
            chtFile.records.forEach((record: any) => {
              const seqValue = record['SEQ'] || record['seq'] || '';
              if (seqValue && !deletedSeqValues.has(seqValue)) {
                keptSeqValues.add(seqValue);
              }
            });
          });

          ProcessService.processDRUFile(records, deletedSeqValues, keptSeqValues);
          processingDetails = 'ประมวลผลไฟล์ DRU: อัปเดต SEQ ตาม kept SEQ จาก CHT';

        } else if (fileType === 'OPD') {
          const processedRecords = ProcessService.processOPDFile(records);
          processingDetails = 'ประมวลผลไฟล์ OPD: อัปเดต OPTYPE และจัดรูปแบบวันที่';

          // เก็บข้อมูลไฟล์ OPD ที่ผ่านการประมวลผลแล้ว
          processedOPDFiles.push({
            filename: file.filename,
            records: processedRecords,
            schema,
          });

        } else if (fileType === 'ADP') {
          // คัดลอกฟิลด์ภาษาไทยจากไฟล์ต้นฉบับ
          ProcessService.copyThaiFieldsFromOriginal(records, records);
          processingDetails = 'ประมวลผลไฟล์ ADP: คัดลอกฟิลด์ภาษาไทยจากไฟล์ต้นฉบับ';
        }

        // คัดลอกฟิลด์ภาษาไทยสำหรับไฟล์อื่นๆ
        if (fileType !== 'ADP' && fileType !== 'OPD') {
          ProcessService.copyThaiFieldsFromOriginal(records, records);
        }

        // บันทึก processing log
        await DatabaseService.saveProcessingLog(
          file.id,
          'linked',
          processingDetails,
          records.length,
          0, // จะคำนวณเวลาจริงในภายหลัง
          'completed',
          user.userId,
          user.userName,
        );

        processedFiles.push({
          filename: file.filename,
          recordCount: records.length,
          processingDetails,
          status: 'completed',
        });

        logger.info(`ประมวลผลไฟล์ ${file.filename}: ${processingDetails}`);

      } catch (error) {
        logger.error(`Error processing file ${file.filename}:`, error);

        // บันทึก processing log error
        await DatabaseService.saveProcessingLog(
          file.id,
          'linked',
          'ประมวลผลไฟล์ DBF',
          0,
          0,
          'error',
          user.userId,
          user.userName,
          error instanceof Error ? error.message : 'Unknown error',
        );

        processedFiles.push({
          filename: file.filename,
          recordCount: 0,
          processingDetails: '',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return processedFiles;
}

// GET /api/process/schema/:filename - ดึง schema ของไฟล์ DBF
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

    const buffer = await readFile(filePath);
    const { schema } = ImportService.parseDBFWithSchema(buffer);

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

// GET /api/process/preview/:filename - ดึงข้อมูลตัวอย่างจากไฟล์ DBF
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

    const buffer = await readFile(filePath);
    const { records, schema } = ImportService.parseDBFWithSchema(buffer);

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

// GET /api/process/status - ตรวจสอบสถานะการประมวลผล
router.get('/status', authenticateToken, (req: any, res): void => {
  try {
    const user = req.user;
    const clientIP = getClientIPAddress(req);

    res.status(200).json({
      message: 'Process service is running',
      user: user.userName,
      ipAddress: clientIP,
      timestamp: new Date().toISOString(),
      features: [
        'File type detection',
        'Linked processing',
        'Thai field preservation',
        'Condition-based updates',
        'Date formatting',
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

export default router; 
