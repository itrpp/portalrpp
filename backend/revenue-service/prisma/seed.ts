// ========================================
// REVENUE SERVICE PRISMA SEED
// ========================================

import { PrismaClient } from '@prisma/client';
import { exit } from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Revenue Service database...');

  // สร้าง system configuration
  const systemConfigs = [
    {
      key: 'MAX_FILE_SIZE',
      value: '52428800', // 50MB in bytes
      description: 'Maximum file size in bytes',
    },
    {
      key: 'ALLOWED_FILE_TYPES',
      value: '.dbf,.xls,.xlsx',
      description: 'Allowed file extensions',
    },
    {
      key: 'UPLOAD_PATH',
      value: './uploads',
      description: 'Base upload path',
    },
    {
      key: 'DBF_ENCODING',
      value: 'cp874',
      description: 'DBF file encoding',
    },
    {
      key: 'RATE_LIMIT_WINDOW_MS',
      value: '900000', // 15 minutes
      description: 'Rate limit window in milliseconds',
    },
    {
      key: 'RATE_LIMIT_MAX_REQUESTS',
      value: '100',
      description: 'Maximum requests per window',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log('✅ System configuration seeded');

  // สร้าง sample upload batches พร้อมข้อมูลจริง
  const batchId1 = 'clm8k0x0y0000f6qtszwb7001';
  const batchId2 = 'clm8k0x0y0001f6qtszwb7002';
  const batchId3 = 'clm8k0x0y0002f6qtszwb7003';

  // Batch 1: Successfully completed batch
  const completedBatch = await prisma.uploadBatch.upsert({
    where: { id: batchId1 },
    update: {},
    create: {
      id: batchId1,
      batchName: 'DBF Files Upload - May 2024',
      uploadDate: new Date('2024-05-15T10:30:00Z'),
      totalFiles: 3,
      successFiles: 3,
      errorFiles: 0,
      processingFiles: 0,
      totalRecords: 15420,
      totalSize: 8745600, // ~8.3MB
      status: 'success',
      processingStatus: 'completed',
      exportStatus: 'exported',
      userId: 'admin001',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  // Batch 2: Processing batch with mixed results
  const processingBatch = await prisma.uploadBatch.upsert({
    where: { id: batchId2 },
    update: {},
    create: {
      id: batchId2,
      batchName: 'REP Files Upload - May 2024',
      uploadDate: new Date('2024-05-16T14:15:00Z'),
      totalFiles: 5,
      successFiles: 3,
      errorFiles: 1,
      processingFiles: 1,
      totalRecords: 8250,
      totalSize: 4125000, // ~3.9MB
      status: 'partial',
      processingStatus: 'completed',
      exportStatus: 'not_exported',
      userId: 'user002',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
    },
  });

  // Batch 3: Current processing batch
  const currentBatch = await prisma.uploadBatch.upsert({
    where: { id: batchId3 },
    update: {},
    create: {
      id: batchId3,
      batchName: 'STM Files Upload - May 2024',
      uploadDate: new Date(),
      totalFiles: 2,
      successFiles: 0,
      errorFiles: 0,
      processingFiles: 2,
      totalRecords: 0,
      totalSize: 2560000, // ~2.4MB
      status: 'processing',
      processingStatus: 'processing',
      exportStatus: 'not_exported',
      userId: 'user003',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    },
  });

  console.log('✅ Sample upload batches seeded');

  // สร้าง sample upload records
  
  // Records สำหรับ batch 1 (completed batch) - DBF Files
  const dbfRecords = [
    {
      id: 'clm8k1x0y0000f6qtszwb7010',
      filename: 'PAT6805_20240515.dbf',
      originalName: 'PAT6805.DBF',
      fileType: 'DBF',
      fileSize: 3125000,
      filePath: '/uploads/dbf/20240515/clm8k0x0y0000f6qtszwb7001/PAT6805_20240515.dbf',
      uploadDate: new Date('2024-05-15T10:32:00Z'),
      processedAt: new Date('2024-05-15T10:35:00Z'),
      status: 'success',
      batchId: batchId1,
      userId: 'admin001',
      ipAddress: '192.168.1.100',
      isValid: true,
      totalRecords: 5140,
      validRecords: 5140,
      invalidRecords: 0,
      processedRecords: 5140,
      skippedRecords: 0,
      processingTime: 180000, // 3 minutes
      metadata: JSON.stringify({
        encoding: 'cp874',
        fields: ['HN', 'PID', 'FNAME', 'LNAME', 'BIRTHDATE', 'SEX'],
        recordCount: 5140
      })
    },
    {
      id: 'clm8k1x0y0001f6qtszwb7011',
      filename: 'OPD6805_20240515.dbf',
      originalName: 'OPD6805.DBF',
      fileType: 'DBF',
      fileSize: 4120000,
      filePath: '/uploads/dbf/20240515/clm8k0x0y0000f6qtszwb7001/OPD6805_20240515.dbf',
      uploadDate: new Date('2024-05-15T10:33:00Z'),
      processedAt: new Date('2024-05-15T10:38:00Z'),
      status: 'success',
      batchId: batchId1,
      userId: 'admin001',
      ipAddress: '192.168.1.100',
      isValid: true,
      totalRecords: 6840,
      validRecords: 6840,
      invalidRecords: 0,
      processedRecords: 6840,
      skippedRecords: 0,
      processingTime: 300000, // 5 minutes
      metadata: JSON.stringify({
        encoding: 'cp874',
        fields: ['HN', 'CLINIC', 'DATEOPD', 'TIMEOPD', 'SEQ'],
        recordCount: 6840
      })
    },
    {
      id: 'clm8k1x0y0002f6qtszwb7012',
      filename: 'CHA6805_20240515.dbf',
      originalName: 'CHA6805.DBF',
      fileType: 'DBF',
      fileSize: 1500600,
      filePath: '/uploads/dbf/20240515/clm8k0x0y0000f6qtszwb7001/CHA6805_20240515.dbf',
      uploadDate: new Date('2024-05-15T10:34:00Z'),
      processedAt: new Date('2024-05-15T10:40:00Z'),
      status: 'success',
      batchId: batchId1,
      userId: 'admin001',
      ipAddress: '192.168.1.100',
      isValid: true,
      totalRecords: 3440,
      validRecords: 3440,
      invalidRecords: 0,
      processedRecords: 3440,
      skippedRecords: 0,
      processingTime: 360000, // 6 minutes
      metadata: JSON.stringify({
        encoding: 'cp874',
        fields: ['HN', 'SEQ', 'CHARGEITEM', 'AMOUNT'],
        recordCount: 3440
      })
    }
  ];

  // Records สำหรับ batch 2 (partial batch) - REP Files
  const repRecords = [
    {
      id: 'clm8k1x0y0003f6qtszwb7013',
      filename: '680600025_20240516.xls',
      originalName: '680600025.xls',
      fileType: 'REP',
      fileSize: 825000,
      filePath: '/uploads/rep/20240516/clm8k0x0y0001f6qtszwb7002/680600025_20240516.xls',
      uploadDate: new Date('2024-05-16T14:16:00Z'),
      processedAt: new Date('2024-05-16T14:18:00Z'),
      status: 'success',
      batchId: batchId2,
      userId: 'user002',
      ipAddress: '192.168.1.101',
      isValid: true,
      totalRecords: 1650,
      validRecords: 1650,
      invalidRecords: 0,
      processedRecords: 1650,
      skippedRecords: 0,
      processingTime: 120000, // 2 minutes
      metadata: JSON.stringify({
        reportType: 'OP',
        month: '05',
        year: '2024',
        hospcode: '10978'
      })
    },
    {
      id: 'clm8k1x0y0004f6qtszwb7014',
      filename: '680600030_20240516.xls',
      originalName: '680600030.xls',
      fileType: 'REP',
      fileSize: 1050000,
      filePath: '/uploads/rep/20240516/clm8k0x0y0001f6qtszwb7002/680600030_20240516.xls',
      uploadDate: new Date('2024-05-16T14:17:00Z'),
      processedAt: new Date('2024-05-16T14:20:00Z'),
      status: 'success',
      batchId: batchId2,
      userId: 'user002',
      ipAddress: '192.168.1.101',
      isValid: true,
      totalRecords: 2100,
      validRecords: 2100,
      invalidRecords: 0,
      processedRecords: 2100,
      skippedRecords: 0,
      processingTime: 180000, // 3 minutes
      metadata: JSON.stringify({
        reportType: 'IP',
        month: '05',
        year: '2024',
        hospcode: '10978'
      })
    },
    {
      id: 'clm8k1x0y0005f6qtszwb7015',
      filename: '680600031_20240516.xls',
      originalName: '680600031.xls',
      fileType: 'REP',
      fileSize: 912500,
      filePath: '/uploads/rep/20240516/clm8k0x0y0001f6qtszwb7002/680600031_20240516.xls',
      uploadDate: new Date('2024-05-16T14:18:00Z'),
      processedAt: new Date('2024-05-16T14:22:00Z'),
      status: 'success',
      batchId: batchId2,
      userId: 'user002',
      ipAddress: '192.168.1.101',
      isValid: true,
      totalRecords: 1825,
      validRecords: 1825,
      invalidRecords: 0,
      processedRecords: 1825,
      skippedRecords: 0,
      processingTime: 240000, // 4 minutes
      metadata: JSON.stringify({
        reportType: 'ADP',
        month: '05',
        year: '2024',
        hospcode: '10978'
      })
    },
    {
      id: 'clm8k1x0y0006f6qtszwb7016',
      filename: '680600032_20240516.xls',
      originalName: '680600032.xls',
      fileType: 'REP',
      fileSize: 450000,
      filePath: '/uploads/rep/20240516/clm8k0x0y0001f6qtszwb7002/680600032_20240516.xls',
      uploadDate: new Date('2024-05-16T14:19:00Z'),
      processedAt: null,
      status: 'failed',
      batchId: batchId2,
      userId: 'user002',
      ipAddress: '192.168.1.101',
      isValid: false,
      errors: JSON.stringify([
        { field: 'TOTAL_AMOUNT', message: 'ยอดรวมไม่ตรงกับรายการ' },
        { field: 'HN', message: 'รูปแบบ HN ไม่ถูกต้อง ในแถวที่ 15, 28, 45' }
      ]),
      warnings: JSON.stringify([
        { field: 'DATE', message: 'พบข้อมูลย้อนหลังเกิน 30 วัน' }
      ]),
      totalRecords: 900,
      validRecords: 0,
      invalidRecords: 900,
      processedRecords: 0,
      skippedRecords: 900,
      processingTime: 45000, // 45 seconds
      errorMessage: 'ไฟล์มีข้อผิดพลาดในการตรวจสอบ กรุณาแก้ไขและอัปโหลดใหม่',
      metadata: JSON.stringify({
        reportType: 'DRU',
        month: '05',
        year: '2024',
        hospcode: '10978'
      })
    },
    {
      id: 'clm8k1x0y0007f6qtszwb7017',
      filename: '680600033_20240516.xls',
      originalName: '680600033.xls',
      fileType: 'REP',
      fileSize: 887500,
      filePath: '/uploads/rep/20240516/clm8k0x0y0001f6qtszwb7002/680600033_20240516.xls',
      uploadDate: new Date('2024-05-16T14:20:00Z'),
      processedAt: null,
      status: 'processing',
      batchId: batchId2,
      userId: 'user002',
      ipAddress: '192.168.1.101',
      isValid: null,
      totalRecords: 1775,
      validRecords: null,
      invalidRecords: null,
      processedRecords: null,
      skippedRecords: null,
      processingTime: null,
      metadata: JSON.stringify({
        reportType: 'CHT',
        month: '05',
        year: '2024',
        hospcode: '10978'
      })
    }
  ];

  // Records สำหรับ batch 3 (current processing) - STM Files
  const stmRecords = [
    {
      id: 'clm8k1x0y0008f6qtszwb7018',
      filename: 'STM_14641_OPUCS256806_01_20240517.xls',
      originalName: 'STM_14641_OPUCS256806_01.xls',
      fileType: 'STM',
      fileSize: 1280000,
      filePath: `/uploads/stm/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}/clm8k0x0y0002f6qtszwb7003/STM_14641_OPUCS256806_01_20240517.xls`,
      uploadDate: new Date(),
      processedAt: null,
      status: 'processing',
      batchId: batchId3,
      userId: 'user003',
      ipAddress: '192.168.1.102',
      isValid: null,
      totalRecords: null,
      validRecords: null,
      invalidRecords: null,
      processedRecords: null,
      skippedRecords: null,
      processingTime: null,
      metadata: JSON.stringify({
        statementType: 'OP',
        month: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: String(new Date().getFullYear()),
        hospcode: '10978',
        sequence: '01'
      })
    },
    {
      id: 'clm8k1x0y0009f6qtszwb7019',
      filename: 'STM_14641_OPUCS256806_02_20240517.xls',
      originalName: 'STM_14641_OPUCS256806_02.xls',
      fileType: 'STM',
      fileSize: 1280000,
      filePath: `/uploads/stm/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}/clm8k0x0y0002f6qtszwb7003/STM_14641_OPUCS256806_02_20240517.xls`,
      uploadDate: new Date(),
      processedAt: null,
      status: 'processing',
      batchId: batchId3,
      userId: 'user003',
      ipAddress: '192.168.1.102',
      isValid: null,
      totalRecords: null,
      validRecords: null,
      invalidRecords: null,
      processedRecords: null,
      skippedRecords: null,
      processingTime: null,
      metadata: JSON.stringify({
        statementType: 'IP',
        month: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: String(new Date().getFullYear()),
        hospcode: '10978',
        sequence: '02'
      })
    }
  ];

  // Insert all upload records
  const allRecords = [...dbfRecords, ...repRecords, ...stmRecords];
  
  for (const record of allRecords) {
    await prisma.uploadRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }

  console.log('✅ Sample upload records seeded');

  // สร้าง sample processing history
  const processingHistoryData = [
    // History for DBF files (batch 1 - completed)
    {
      id: 'clm8k2x0y0000f6qtszwb7020',
      uploadId: 'clm8k1x0y0000f6qtszwb7010', // PAT6805
      action: 'VALIDATE',
      status: 'success',
      message: 'ตรวจสอบโครงสร้างไฟล์ DBF เสร็จสิ้น',
      startTime: new Date('2024-05-15T10:32:30Z'),
      endTime: new Date('2024-05-15T10:33:00Z'),
      duration: 30000 // 30 seconds
    },
    {
      id: 'clm8k2x0y0001f6qtszwb7021',
      uploadId: 'clm8k1x0y0000f6qtszwb7010', // PAT6805
      action: 'PROCESS',
      status: 'success',
      message: 'ประมวลผลข้อมูลผู้ป่วยเสร็จสิ้น พบ 5,140 รายการ',
      startTime: new Date('2024-05-15T10:33:00Z'),
      endTime: new Date('2024-05-15T10:35:00Z'),
      duration: 120000 // 2 minutes
    },
    {
      id: 'clm8k2x0y0002f6qtszwb7022',
      uploadId: 'clm8k1x0y0000f6qtszwb7010', // PAT6805
      action: 'BACKUP',
      status: 'success',
      message: 'สำรองข้อมูลเสร็จสิ้น',
      startTime: new Date('2024-05-15T10:35:00Z'),
      endTime: new Date('2024-05-15T10:35:30Z'),
      duration: 30000 // 30 seconds
    },
    
    // History for REP file with validation error
    {
      id: 'clm8k2x0y0003f6qtszwb7023',
      uploadId: 'clm8k1x0y0006f6qtszwb7016', // 680600032 - failed file
      action: 'VALIDATE',
      status: 'failed',
      message: 'พบข้อผิดพลาดในการตรวจสอบข้อมูล',
      startTime: new Date('2024-05-16T14:19:30Z'),
      endTime: new Date('2024-05-16T14:20:15Z'),
      duration: 45000, // 45 seconds
      error: 'Validation failed: ยอดรวมไม่ตรงกับรายการ, รูปแบบ HN ไม่ถูกต้อง',
      stackTrace: 'ValidationError: Field validation failed at line 15, 28, 45\n  at validateRecord (fileValidationService.ts:142)'
    },
    
    // History for currently processing STM files
    {
      id: 'clm8k2x0y0004f6qtszwb7024',
      uploadId: 'clm8k1x0y0008f6qtszwb7018', // STM file 1
      action: 'VALIDATE',
      status: 'processing',
      message: 'เริ่มตรวจสอบไฟล์ Statement',
      startTime: new Date(),
      endTime: null,
      duration: null
    },
    {
      id: 'clm8k2x0y0005f6qtszwb7025',
      uploadId: 'clm8k1x0y0009f6qtszwb7019', // STM file 2
      action: 'VALIDATE',
      status: 'processing',
      message: 'เริ่มตรวจสอบไฟล์ Statement',
      startTime: new Date(),
      endTime: null,
      duration: null
    }
  ];

  for (const history of processingHistoryData) {
    await prisma.processingHistory.upsert({
      where: { id: history.id },
      update: {},
      create: history,
    });
  }

  console.log('✅ Processing history seeded');

  // สร้าง upload statistics สำหรับหลายวัน
  const statisticsData = [
    // วันนี้ (กำลังประมวลผล)
    {
      date: new Date(),
      totalUploads: 2, // STM files ที่กำลังประมวลผล
      successfulUploads: 0,
      failedUploads: 0,
      dbfUploads: 0,
      repUploads: 0,
      stmUploads: 2,
      totalFileSize: 2560000, // 2.5MB
      averageFileSize: 1280000, // 1.2MB
      totalProcessingTime: 0, // ยังไม่เสร็จ
      averageProcessingTime: 0,
      totalRecords: 0, // ยังไม่เสร็จ
      validRecords: 0,
      invalidRecords: 0,
    },
    // เมื่อวาน (batch 2 - REP files)
    {
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      totalUploads: 5,
      successfulUploads: 3,
      failedUploads: 1, // 1 validation failed, 1 still processing
      dbfUploads: 0,
      repUploads: 5,
      stmUploads: 0,
      totalFileSize: 4125000, // ~4MB
      averageFileSize: 825000, // ~825KB
      totalProcessingTime: 540000, // 9 minutes total
      averageProcessingTime: 180000, // 3 minutes average (only completed ones)
      totalRecords: 8250,
      validRecords: 5575, // 1650 + 2100 + 1825
      invalidRecords: 900, // from failed file
    },
    // 2 วันก่อน (batch 1 - DBF files)
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      totalUploads: 3,
      successfulUploads: 3,
      failedUploads: 0,
      dbfUploads: 3,
      repUploads: 0,
      stmUploads: 0,
      totalFileSize: 8745600, // ~8.3MB
      averageFileSize: 2915200, // ~2.8MB
      totalProcessingTime: 840000, // 14 minutes total
      averageProcessingTime: 280000, // ~4.7 minutes average
      totalRecords: 15420,
      validRecords: 15420,
      invalidRecords: 0,
    }
  ];

  for (const stats of statisticsData) {
    const statDate = new Date(stats.date);
    statDate.setHours(0, 0, 0, 0);
    
    await prisma.uploadStatistics.upsert({
      where: { date: statDate },
      update: {},
      create: {
        ...stats,
        date: statDate,
      },
    });
  }

  console.log('✅ Upload statistics seeded');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 