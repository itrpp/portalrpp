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

  // สร้าง sample upload batch
  const sampleBatch = await prisma.uploadBatch.upsert({
    where: { id: 'sample-batch-001' },
    update: {},
    create: {
      id: 'sample-batch-001',
      batchName: 'Sample Upload Batch',
      uploadDate: new Date(),
      totalFiles: 0,
      successFiles: 0,
      errorFiles: 0,
      processingFiles: 0,
      totalRecords: 0,
      totalSize: 0,
      status: 'PROCESSING',
      userId: 'sample-user',
      ipAddress: '127.0.0.1',
      userAgent: 'Sample User Agent',
    },
  });

  console.log('✅ Sample upload batch seeded');

  // สร้าง sample upload statistics สำหรับวันนี้
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.uploadStatistics.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      dbfUploads: 0,
      repUploads: 0,
      stmUploads: 0,
      totalFileSize: 0,
      averageFileSize: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
    },
  });

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