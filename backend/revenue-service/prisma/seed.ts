import { PrismaClient, RevenueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting revenue service database seeding...');

  // ใช้ external user ID จาก auth-service
  const externalUserId = '1'; // Mock user ID for development

  // สร้าง sample revenue categories
  const categories = [
    {
      name: 'ค่าบริการทางการแพทย์',
      description: 'รายได้จากบริการทางการแพทย์',
      color: '#3B82F6',
      icon: 'stethoscope'
    },
    {
      name: 'ค่าบริการห้องปฏิบัติการ',
      description: 'รายได้จากห้องปฏิบัติการ',
      color: '#10B981',
      icon: 'flask'
    },
    {
      name: 'ค่าบริการรังสีวิทยา',
      description: 'รายได้จากรังสีวิทยา',
      color: '#F59E0B',
      icon: 'x-ray'
    },
    {
      name: 'ค่าบริการเภสัชกรรม',
      description: 'รายได้จากเภสัชกรรม',
      color: '#EF4444',
      icon: 'pills'
    },
    {
      name: 'ค่าบริการอื่นๆ',
      description: 'รายได้จากบริการอื่นๆ',
      color: '#8B5CF6',
      icon: 'plus-circle'
    }
  ];

  console.log('📂 Creating revenue categories...');
  for (const category of categories) {
    await prisma.revenueCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  // สร้าง sample revenue data
  const sampleRevenues = [
    {
      title: 'ค่าบริการตรวจสุขภาพ',
      description: 'ค่าบริการตรวจสุขภาพประจำปี',
      amount: 1500.00,
      categoryName: 'ค่าบริการทางการแพทย์',
      type: RevenueType.INCOME,
      date: new Date('2024-01-15'),
      userId: externalUserId
    },
    {
      title: 'ค่าบริการห้องปฏิบัติการ',
      description: 'การตรวจเลือดและปัสสาวะ',
      amount: 800.00,
      categoryName: 'ค่าบริการห้องปฏิบัติการ',
      type: RevenueType.INCOME,
      date: new Date('2024-01-16'),
      userId: externalUserId
    },
    {
      title: 'ค่าบริการรังสีวิทยา',
      description: 'การตรวจ X-Ray ทรวงอก',
      amount: 1200.00,
      categoryName: 'ค่าบริการรังสีวิทยา',
      type: RevenueType.INCOME,
      date: new Date('2024-01-17'),
      userId: externalUserId
    },
    {
      title: 'ค่าบริการเภสัชกรรม',
      description: 'การจ่ายยาและคำแนะนำ',
      amount: 300.00,
      categoryName: 'ค่าบริการเภสัชกรรม',
      type: RevenueType.INCOME,
      date: new Date('2024-01-18'),
      userId: externalUserId
    },
    {
      title: 'ค่าบริการอื่นๆ',
      description: 'ค่าบริการเพิ่มเติม',
      amount: 500.00,
      categoryName: 'ค่าบริการอื่นๆ',
      type: RevenueType.INCOME,
      date: new Date('2024-01-19'),
      userId: externalUserId
    }
  ];

  console.log('💰 Creating sample revenue records...');
  for (const revenue of sampleRevenues) {
    await prisma.revenue.create({
      data: revenue
    });
  }

  // สร้าง sample DBF files ก่อน
  const sampleDBFFiles = [
    {
      filename: 'sample_adp_001.dbf',
      originalName: 'ADP_SAMPLE_001.DBF',
      size: 1024,
      userId: externalUserId,
      status: 'uploaded',
      schema: JSON.stringify([
        { name: 'CODE', type: 'Character', length: 5 },
        { name: 'QTY', type: 'Numeric', length: 3 },
        { name: 'RATE', type: 'Numeric', length: 6 },
        { name: 'TOTAL', type: 'Numeric', length: 8 },
        { name: 'DATE', type: 'Date', length: 8 }
      ])
    },
    {
      filename: 'sample_opd_001.dbf',
      originalName: 'OPD_SAMPLE_001.DBF',
      size: 2048,
      userId: externalUserId,
      status: 'uploaded',
      schema: JSON.stringify([
        { name: 'PATIENT_ID', type: 'Character', length: 10 },
        { name: 'DIAGNOSIS', type: 'Character', length: 50 },
        { name: 'TREATMENT', type: 'Character', length: 100 },
        { name: 'COST', type: 'Numeric', length: 8 }
      ])
    }
  ];

  console.log('📁 Creating sample DBF files...');
  const createdFiles = [];
  for (const file of sampleDBFFiles) {
    const createdFile = await prisma.dBFFile.create({
      data: file
    });
    createdFiles.push(createdFile);
  }

  // ตรวจสอบว่าสร้างไฟล์สำเร็จแล้ว
  if (createdFiles.length === 0) {
    throw new Error('Failed to create DBF files');
  }

  // สร้าง DBF Conditions ตาม DBF_Manage - ใช้ fileId จากไฟล์ที่สร้างแล้ว
  const dbfConditions = [
    {
      name: 'ADP Update Condition 1',
      description: 'กลุ่มที่ 1 - อัปเดต CODE: 32501-32504',
      rules: JSON.stringify({
        codeRange: ['32501', '32502', '32503', '32504'],
        updates: {
          CODE: '32004',
          QTY: '1',
          RATE: '200',
          TOTAL: '200'
        },
        dateFormat: 'd/m/yyyy'
      }),
      userId: externalUserId,
      fileId: createdFiles[0]!.id // ใช้ fileId จากไฟล์แรก
    },
    {
      name: 'ADP Update Condition 2',
      description: 'กลุ่มที่ 2 - อัปเดต CODE: 32102-32105',
      rules: JSON.stringify({
        codeRange: ['32102', '32103', '32104', '32105'],
        updates: {
          CODE: '32004',
          QTY: '1',
          RATE: '200',
          TOTAL: '200'
        },
        dateFormat: 'd/m/yyyy'
      }),
      userId: externalUserId,
      fileId: createdFiles[0]!.id // ใช้ fileId จากไฟล์แรก
    },
    {
      name: 'ADP Update Condition 3',
      description: 'กลุ่มที่ 3 - อัปเดต CODE: 32208-32311',
      rules: JSON.stringify({
        codeRange: ['32208', '32209', '32310', '32311'],
        updates: {
          CODE: '32004',
          QTY: '1',
          RATE: '200',
          TOTAL: '200'
        },
        dateFormat: 'd/m/yyyy'
      }),
      userId: externalUserId,
      fileId: createdFiles[1]!.id // ใช้ fileId จากไฟล์ที่สอง
    }
  ];

  console.log('🔧 Creating DBF conditions...');
  for (const condition of dbfConditions) {
    await prisma.dBFCondition.create({
      data: condition
    });
  }

  console.log('✅ Revenue service database seeding completed!');
  console.log(`📊 Created ${categories.length} categories`);
  console.log(`💰 Created ${sampleRevenues.length} revenue records`);
  console.log(`📁 Created ${sampleDBFFiles.length} sample DBF files`);
  console.log(`🔧 Created ${dbfConditions.length} DBF conditions`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 