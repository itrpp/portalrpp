const path = require('path');

/**
 * โหมดประหยัด RAM (เครื่อง ~4GB): ตั้ง NEXT_LOW_MEMORY=1
 * ค่าเริ่มต้นไม่บังคับ cpus:1 — ให้ Next ใช้หลาย core ตามเครื่อง
 *
 * NEXT_BUILD_CPUS — จำกัดจำนวน worker (ถ้าตั้ง)
 */
const lowMemory = process.env.NEXT_LOW_MEMORY === '1';
const buildCpusEnv = process.env.NEXT_BUILD_CPUS
  ? Number(process.env.NEXT_BUILD_CPUS)
  : undefined;
const hasBuildCpus = Number.isFinite(buildCpusEnv) && buildCpusEnv > 0;

const prismaClientPath = path.resolve(__dirname, 'node_modules/@prisma/client');
const repoRoot = path.join(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // สำหรับ self-host: ได้ .next/standalone (next start ยังใช้ได้ตามเดิม)
  output: 'standalone',
  // monorepo: กัน warning multiple lockfiles + ให้ file tracing ถูก root
  outputFileTracingRoot: repoRoot,
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
  experimental: {
    ...(lowMemory
      ? { cpus: 1, workerThreads: false }
      : hasBuildCpus
        ? { cpus: buildCpusEnv }
        : {}),
    optimizePackageImports: [
      '@heroui/react',
      '@heroui/theme',
      '@iconify/react',
      '@heroicons/react',
      'recharts',
    ],
  },
  // Turbopack (`next build --turbopack`) ไม่ใช้ webpack() — ต้องใส่ alias ที่นี่ด้วย
  turbopack: {
    resolveAlias: {
      '@': __dirname,
      '@prisma/client': prismaClientPath,
    },
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
    // low-memory: 1 compiler กัน swap — นอกนั้นให้ webpack ใช้ parallelism ตามปกติ
    if (lowMemory) {
      config.parallelism = 1;
    }

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
      '@prisma/client': prismaClientPath,
    };

    // เผื่อกรณี environment ไม่ได้ตั้งค่าชนิดไฟล์ครบ
    config.resolve.extensions = Array.from(
      new Set([...(config.resolve.extensions || []), '.ts', '.tsx', '.js', '.jsx']),
    );

    return config;
  },
};

module.exports = nextConfig;
