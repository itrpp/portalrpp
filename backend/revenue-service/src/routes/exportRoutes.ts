import express from 'express';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { AuthService } from '../services/authService';
import { ImportService } from '../services/importService';
import { ProcessService } from '../services/processService';
import { logger } from '../utils/logger';

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

// POST /api/export/all - ส่งออกไฟล์ DBF ทั้งหมด
router.post('/all', authenticateToken, async (req, res): Promise<void> => {
  try {
    logger.info('Export API called');

    const user = (req as any).user;
    const clientIP = getClientIPAddress(req);
    const { processByType = true } = req.body;

    // สร้าง path สำหรับไฟล์ของผู้ใช้
    const uploadDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipUserDir = join(userDir, ipFolderName);

    // สร้างโฟลเดอร์สำหรับ export
    const exportDir = join(process.cwd(), 'exports');
    const userExportDir = join(exportDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipExportDir = join(userExportDir, ipFolderName);

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    await mkdir(ipExportDir, { recursive: true });

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

    // ลบไฟล์เก่าในโฟลเดอร์ export
    try {
      const existingFiles = await readdir(ipExportDir);
      for (const file of existingFiles) {
        if (file.toLowerCase().endsWith('.dbf')) {
          await unlink(join(ipExportDir, file));
          logger.info(`ลบไฟล์เก่า: ${file}`);
        }
      }
    } catch {
      logger.info('ไม่มีไฟล์เก่าให้ลบ');
    }

    const exportedFiles: any[] = [];
    const startTime = Date.now();

    if (processByType) {
      // ประมวลผลแบบเชื่อมโยงตามประเภทไฟล์
      const result = await exportLinkedFiles(dbfFiles, ipUserDir, ipExportDir);
      exportedFiles.push(...result);
    } else {
      // ประมวลผลแบบแยกไฟล์
      for (const filename of dbfFiles) {
        try {
          const filePath = join(ipUserDir, filename);
          const buffer = await readFile(filePath);
          const { records, schema } = ImportService.parseDBFWithSchema(buffer);

          const baseName = filename.replace(/\.dbf$/i, '');
          const cleanName = baseName.replace(/^\d+_/, '').replace(/_\d+$/, '');
          const exportFilename = `${cleanName}.dbf`;
          const exportPath = join(ipExportDir, exportFilename);

          // สร้างไฟล์ DBF ใหม่
          const exportBuffer = createDBFBuffer(records, schema);
          await writeFile(exportPath, exportBuffer);

          exportedFiles.push({
            originalFile: filename,
            exportedFile: exportFilename,
            recordCount: records.length,
            updatedRecordCount: 0,
            downloadUrl: `/api/export/download/${exportFilename}`,
            status: 'completed',
          });

          logger.info(`ส่งออกไฟล์ ${filename} เป็น ${exportFilename}`);

        } catch (error) {
          logger.error(`Error exporting file ${filename}:`, error);
          exportedFiles.push({
            originalFile: filename,
            exportedFile: '',
            recordCount: 0,
            updatedRecordCount: 0,
            downloadUrl: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // สร้างไฟล์ ZIP ถ้ามีไฟล์ที่ส่งออก
    let zipUrl = '';
    if (exportedFiles.some(file => file.status === 'completed')) {
      const zipFilename = `export_${Date.now()}.zip`;
      const zipPath = join(ipExportDir, zipFilename);
      await createZipArchive(ipExportDir, zipPath);
      zipUrl = `/api/export/download/${zipFilename}`;
    }

    res.status(200).json({
      message: 'Export completed successfully',
      exportedFiles,
      processingTime,
      zipUrl,
      totalFiles: dbfFiles.length,
      successfulExports: exportedFiles.filter(f => f.status === 'completed').length,
      failedExports: exportedFiles.filter(f => f.status === 'error').length,
    });

  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ฟังก์ชันสำหรับส่งออกแบบเชื่อมโยงตามประเภทไฟล์
async function exportLinkedFiles(
  files: string[],
  userDir: string,
  exportDir: string,
): Promise<any[]> {
  const exportedFiles: any[] = [];
  const deletedSeqValues = new Set<string>();
  const keptSeqValues = new Set<string>();
  const processedCHTFiles: any[] = [];
  const processedOPDFiles: any[] = [];
  const insRecords: any[] = [];

  // อ่านไฟล์ INS ก่อนเพื่อใช้ในการประมวลผลไฟล์ OPD
  for (const filename of files) {
    try {
      const filePath = join(userDir, filename);
      const buffer = await readFile(filePath);
      const { records, schema } = ImportService.parseDBFWithSchema(buffer);

      if (ImportService.isINSFile(filename, schema)) {
        insRecords.push(...records);
        logger.info(`อ่านไฟล์ INS: ${filename}, จำนวน records: ${records.length}`);
      }
    } catch (error) {
      logger.error(`Error reading INS file ${filename}:`, error);
    }
  }

  // ประมวลผลไฟล์ตามลำดับ: CHT → CHA → INS → DRU → OPD → ADP
  const fileOrder = ['CHT', 'CHA', 'INS', 'DRU', 'OPD', 'ADP'];

  for (const fileType of fileOrder) {
    const typeFiles = files.filter(f => f.toUpperCase().includes(fileType));

    for (const filename of typeFiles) {
      try {
        const filePath = join(userDir, filename);
        const buffer = await readFile(filePath);
        const { records, schema } = ImportService.parseDBFWithSchema(buffer);

        let processedRecords = records;
        let exportFilename = '';
        let hasUpdates = false;

        // ประมวลผลตามประเภทไฟล์
        if (fileType === 'CHT' && ImportService.isCHTFile(filename, schema)) {
          const chtResult = ProcessService.processCHTFile(records);
          processedRecords = chtResult.updatedRecords;
          chtResult.deletedSeqValues.forEach(seq => deletedSeqValues.add(seq));

          // เก็บข้อมูลไฟล์ CHT ที่ผ่านการประมวลผลแล้ว
          processedCHTFiles.push({
            filename,
            records: processedRecords,
            schema,
            deletedSeqValues: chtResult.deletedSeqValues,
          });

          hasUpdates = chtResult.deletedSeqValues.size > 0;

        } else if (fileType === 'CHA' && ImportService.isCHAFile(filename, schema)) {
          processedRecords = ProcessService.processCHAFile(records, deletedSeqValues);
          hasUpdates = true;

        } else if (fileType === 'INS' && ImportService.isINSFile(filename, schema)) {
          processedRecords = ProcessService.processINSFile(records, deletedSeqValues);
          hasUpdates = deletedSeqValues.size > 0;

        } else if (fileType === 'DRU' && ImportService.isDRUFile(filename, schema)) {
          // รวบรวม kept SEQ จากไฟล์ CHT
          processedCHTFiles.forEach(chtFile => {
            chtFile.records.forEach((record: any) => {
              const seqValue = record['SEQ'] || record['seq'] || '';
              if (seqValue && !deletedSeqValues.has(seqValue)) {
                keptSeqValues.add(seqValue);
              }
            });
          });

          processedRecords = ProcessService.processDRUFile(records, deletedSeqValues, keptSeqValues);
          hasUpdates = true;

        } else if (fileType === 'OPD' && ImportService.isOPDFile(filename, schema)) {
          processedRecords = ProcessService.processOPDFile(records);
          hasUpdates = true;

          // เก็บข้อมูลไฟล์ OPD ที่ผ่านการประมวลผลแล้ว
          processedOPDFiles.push({
            filename,
            records: processedRecords,
            schema,
          });

        } else if (fileType === 'ADP' && ImportService.isADPFile(filename, schema)) {
          // คัดลอกฟิลด์ภาษาไทยจากไฟล์ต้นฉบับ
          processedRecords = ProcessService.copyThaiFieldsFromOriginal(records, processedRecords);
          hasUpdates = true;
        }

        // คัดลอกฟิลด์ภาษาไทยสำหรับไฟล์อื่นๆ
        if (fileType !== 'ADP' && fileType !== 'OPD') {
          processedRecords = ProcessService.copyThaiFieldsFromOriginal(records, processedRecords);
        }

        // สร้างชื่อไฟล์สำหรับ export
        const baseName = filename.replace(/\.dbf$/i, '');
        const cleanName = baseName.replace(/^\d+_/, '').replace(/_\d+$/, '');

        if (hasUpdates) {
          exportFilename = `${cleanName}_UPDATED.dbf`;
        } else {
          exportFilename = `${cleanName}.dbf`;
        }

        const exportPath = join(exportDir, exportFilename);

        // สร้างไฟล์ DBF ใหม่
        const exportBuffer = createDBFBuffer(processedRecords, schema);
        await writeFile(exportPath, exportBuffer);

        exportedFiles.push({
          originalFile: filename,
          exportedFile: exportFilename,
          recordCount: processedRecords.length,
          updatedRecordCount: hasUpdates ? processedRecords.length : 0,
          downloadUrl: `/api/export/download/${exportFilename}`,
          status: 'completed',
        });

        logger.info(`ส่งออกไฟล์ ${filename} เป็น ${exportFilename}`);

      } catch (error) {
        logger.error(`Error exporting file ${filename}:`, error);
        exportedFiles.push({
          originalFile: filename,
          exportedFile: '',
          recordCount: 0,
          updatedRecordCount: 0,
          downloadUrl: '',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return exportedFiles;
}

// ฟังก์ชันสำหรับสร้างไฟล์ DBF buffer
function createDBFBuffer(records: any[], fields: any[]): Buffer {
  // สร้าง header
  const headerLength = 32 + (fields.length * 32) + 1;
  const recordLength = fields.reduce((sum, field) => sum + field.length, 1);
  const header = Buffer.alloc(headerLength);

  // ตั้งค่า header
  header[0] = 0x03; // Version
  header[1] = new Date().getFullYear() - 1900; // Year
  header[2] = new Date().getMonth() + 1; // Month
  header[3] = new Date().getDate(); // Day
  header.writeUInt32LE(records.length, 4); // Record count
  header.writeUInt16LE(headerLength, 8); // Header length
  header.writeUInt16LE(recordLength, 10); // Record length

  // เขียน field descriptors
  let offset = 32;
  for (const field of fields) {
    const fieldName = field.name.padEnd(11, '\0');
    header.write(fieldName, offset, 11, 'ascii');
    header[offset + 11] = field.type.charCodeAt(0);
    header.writeUInt32LE(0, offset + 12); // Reserved
    header[offset + 16] = field.length;
    header[offset + 17] = field.decimalPlaces;
    header.writeUInt16LE(0, offset + 18); // Reserved
    header.writeUInt8(0, offset + 20); // Work area ID
    header.writeUInt16LE(0, offset + 21); // Reserved
    header.writeUInt8(0, offset + 23); // Set fields flag
    header.writeUInt32LE(0, offset + 24); // Reserved
    header.writeUInt32LE(0, offset + 28); // Reserved
    offset += 32;
  }

  header[offset] = 0x0D; // Field terminator
  header[headerLength - 1] = 0x1A; // End of file marker

  // สร้าง record buffers
  const recordBuffers: Buffer[] = [];

  for (const record of records) {
    const recordBuffer = Buffer.alloc(recordLength);
    let fieldOffset = 0;

    for (const field of fields) {
      const value = record[field.name] || '';
      let fieldValue = '';

      // จัดรูปแบบข้อมูลตามประเภท
      switch (field.type) {
        case 'N': // Numeric
          fieldValue = String(value).padStart(field.length, ' ');
          break;
        case 'D': // Date
          if (value instanceof Date) {
            fieldValue = ProcessService.formatDateForExport(value);
          } else {
            fieldValue = String(value).padStart(field.length, ' ');
          }
          break;
        case 'L': // Logical
          fieldValue = value ? 'T' : 'F';
          break;
        default: // Character
          fieldValue = String(value).padEnd(field.length, ' ');
      }

      recordBuffer.write(fieldValue, fieldOffset, field.length, 'ascii');
      fieldOffset += field.length;
    }

    recordBuffers.push(recordBuffer);
  }

  // รวม header และ records
  const buffers = [header, ...recordBuffers];
  return Buffer.concat(buffers);
}

// ฟังก์ชันสำหรับสร้างไฟล์ ZIP
async function createZipArchive(sourceDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // ระดับการบีบอัดสูงสุด
    });

    output.on('close', () => {
      logger.info(`ZIP file created: ${zipPath}, size: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// GET /api/export/download/:filename - ดาวน์โหลดไฟล์ที่ส่งออก
router.get('/download/:filename', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const user = (req as any).user;
    const clientIP = getClientIPAddress(req);

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const exportDir = join(process.cwd(), 'exports');
    const userExportDir = join(exportDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
    const ipFolderName = clientIP.replace(/\./g, '_');
    const ipExportDir = join(userExportDir, ipFolderName);
    const filePath = join(ipExportDir, filename);

    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.download(filePath, filename);

  } catch (error) {
    logger.error('Download error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/export/status - ตรวจสอบสถานะการส่งออก
router.get('/status', authenticateToken, (req, res): void => {
  try {
    const user = (req as any).user;
    const clientIP = getClientIPAddress(req);

    res.status(200).json({
      message: 'Export service is running',
      user: user.userName,
      ipAddress: clientIP,
      timestamp: new Date().toISOString(),
      features: [
        'Linked file processing',
        'Thai field preservation',
        'Condition-based updates',
        'ZIP archive creation',
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
