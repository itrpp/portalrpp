import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 เริ่มต้นการ seed ข้อมูล...');

  // สร้าง admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rpphosp.local' },
    update: {},
    create: {
      email: 'admin@rpphosp.local',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      authMethod: 'local',
    },
  });

  console.log('✅ สร้าง admin user สำเร็จ:', adminUser.email);

  // สร้าง user ปกติ
  const userPassword = await bcrypt.hash('user123', 12);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@rpphosp.local' },
    update: {},
    create: {
      email: 'user@rpphosp.local',
      name: 'Regular User',
      password: userPassword,
      role: 'user',
      isActive: true,
      authMethod: 'local',
    },
  });

  console.log('✅ สร้าง user สำเร็จ:', regularUser.email);

  console.log('🎉 การ seed ข้อมูลเสร็จสิ้น!');
  console.log('👤 Admin: admin@rpphosp.local (รหัสผ่าน: admin123)');
  console.log('👤 User: user@rpphosp.local (รหัสผ่าน: user123)');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการ seed ข้อมูล:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 