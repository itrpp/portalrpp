import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // ลบข้อมูลเก่าทั้งหมด
    await prisma.exportLog.deleteMany();
    await prisma.processingLog.deleteMany();
    await prisma.schema.deleteMany();
    await prisma.record.deleteMany();
    await prisma.file.deleteMany();

    console.log('✅ Cleared existing data');

    // สร้างข้อมูลตัวอย่าง
    const sampleFiles = [
        {
            filename: 'sample_adp_20241201_001.dbf',
            originalName: 'ADP_SAMPLE.DBF',
            size: 1024,
            status: 'uploaded',
            fileType: 'ADP',
            schema: JSON.stringify([
                { name: 'ADP', type: 'C', length: 10, decimalPlaces: 0 },
                { name: 'NAME', type: 'C', length: 50, decimalPlaces: 0 },
                { name: 'AMOUNT', type: 'N', length: 10, decimalPlaces: 2 },
            ]),
            userId: 'sample-user-1',
            userName: 'sample_user',
            ipAddress: '127.0.0.1',
            filePath: 'uploads/sample_user/127_0_0_1/sample_adp_20241201_001.dbf',
        },
        {
            filename: 'sample_cht_20241201_001.dbf',
            originalName: 'CHT_SAMPLE.DBF',
            size: 2048,
            status: 'uploaded',
            fileType: 'CHT',
            schema: JSON.stringify([
                { name: 'SEQ', type: 'C', length: 10, decimalPlaces: 0 },
                { name: 'CODE', type: 'C', length: 20, decimalPlaces: 0 },
                { name: 'QTY', type: 'N', length: 8, decimalPlaces: 0 },
            ]),
            userId: 'sample-user-1',
            userName: 'sample_user',
            ipAddress: '127.0.0.1',
            filePath: 'uploads/sample_user/127_0_0_1/sample_cht_20241201_001.dbf',
        },
    ];

    // สร้างไฟล์ตัวอย่าง
    for (const fileData of sampleFiles) {
        const file = await prisma.file.create({
            data: fileData,
        });

        console.log(`✅ Created file: ${file.filename}`);

        // สร้าง schema records
        const schema = JSON.parse(fileData.schema);
        for (let i = 0; i < schema.length; i++) {
            const field = schema[i];
            await prisma.schema.create({
                data: {
                    fileId: file.id,
                    fieldName: field.name,
                    fieldType: field.type,
                    fieldLength: field.length,
                    fieldDecimal: field.decimalPlaces,
                    fieldOffset: i * 32 + 32,
                },
            });
        }

        // สร้าง sample records
        const sampleRecords = [];
        for (let i = 0; i < 5; i++) {
            if (fileData.fileType === 'ADP') {
                sampleRecords.push({
                    fileId: file.id,
                    rowIndex: i,
                    data: JSON.stringify({
                        ADP: `ADP${String(i + 1).padStart(3, '0')}`,
                        NAME: `Sample Name ${i + 1}`,
                        AMOUNT: (Math.random() * 10000).toFixed(2),
                    }),
                });
            } else if (fileData.fileType === 'CHT') {
                sampleRecords.push({
                    fileId: file.id,
                    rowIndex: i,
                    data: JSON.stringify({
                        SEQ: `SEQ${String(i + 1).padStart(3, '0')}`,
                        CODE: `CODE${String(i + 1).padStart(3, '0')}`,
                        QTY: Math.floor(Math.random() * 100) + 1,
                    }),
                });
            }
        }

        await prisma.record.createMany({
            data: sampleRecords,
        });

        console.log(`✅ Created ${sampleRecords.length} records for ${file.filename}`);
    }

    // สร้าง processing logs ตัวอย่าง
    await prisma.processingLog.create({
        data: {
            fileId: (await prisma.file.findFirst())?.id || '',
            processType: 'batch',
            processDetails: 'ประมวลผลไฟล์ตัวอย่าง',
            recordCount: 5,
            processingTime: 1500,
            status: 'completed',
            userId: 'sample-user-1',
            userName: 'sample_user',
        },
    });

    console.log('✅ Created sample processing log');

    // สร้าง export log ตัวอย่าง
    await prisma.exportLog.create({
        data: {
            fileId: (await prisma.file.findFirst())?.id || '',
            exportType: 'DBF',
            exportFormat: 'DBF',
            recordCount: 5,
            fileSize: 1024,
            downloadPath: 'exports/sample_export.dbf',
            userId: 'sample-user-1',
            userName: 'sample_user',
        },
    });

    console.log('✅ Created sample export log');

    console.log('🎉 Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 