const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // สำหรับ self-host: ได้ .next/standalone (next start ยังใช้ได้ตามเดิม)
  output: 'standalone',
  // Keep Prisma's WASM query compiler and driver adapter out of the webpack bundle.
  // Bundling them causes: TypeError: Cannot read properties of undefined (reading 'graph')
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-mariadb',
    'mariadb',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'ldapts',
  ],
  // เครื่อง 4GB: อย่าให้ Next แตก worker ตามจำนวน core
  experimental: {
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: [
      '@heroui/react',
      '@heroui/theme',
      '@iconify/react',
      '@heroicons/react',
      'recharts',
    ],
  },
  eslint: {
    // lint แยกด้วย `npm run lint` — ไม่รันซ้ำตอน next build เพื่อประหยัด RAM
    ignoreDuringBuilds: true,
  },
  typescript: {
    // typecheck แยกด้วย `npm run typecheck` บนเครื่องที่มี RAM พอ
    ignoreBuildErrors: true,
  },
  // อนุญาต dev origins สำหรับ asset ของ Next.js ในโหมดพัฒนา
  allowedDevOrigins: ['portal.rpphosp.go.th', 'localhost:3000', '127.0.0.1:3000'],
  webpack: (config) => {
    // เครื่อง 4GB: webpack ใช้ 1 compiler เท่านั้น กัน swap
    config.parallelism = 1;

    // แก้ไขปัญหา ES modules สำหรับ @iconify/react
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // แก้ไขปัญหา case sensitivity บน Linux
    config.resolve.symlinks = false;

    // ให้ shared/generated/prisma (อยู่นอก frontend) resolve @prisma/client จาก frontend
    // ใช้ alias แทน resolve.modules เพื่อไม่ให้กระทบ next-auth/openid-client (lru-cache v6)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      '@prisma/client': path.resolve(__dirname, 'node_modules/@prisma/client'),
    };

    // เผื่อกรณี environment ไม่ได้ตั้งค่าชนิดไฟล์ครบ
    config.resolve.extensions = Array.from(
      new Set([...(config.resolve.extensions || []), '.ts', '.tsx', '.js', '.jsx']),
    );

    return config;
  },
};

module.exports = nextConfig;
