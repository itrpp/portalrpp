const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    eslint: {
        // ไม่ให้ ESLint ทำให้ build ล้ม เพื่อให้ปล่อยผ่าน production build ได้
        ignoreDuringBuilds: false,
    },
    // อนุญาต dev origins สำหรับ asset ของ Next.js ในโหมดพัฒนา
    allowedDevOrigins: [
        'portal.rpphosp.go.th',
        'localhost:3000',
        '127.0.0.1:3000'
    ],
    // แก้ไขปัญหา @iconify/react บน Linux
    webpack: (config, { isServer }) => {
        // แก้ไขปัญหา ES modules สำหรับ @iconify/react
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        
        // แก้ไขปัญหา case sensitivity บน Linux
        config.resolve.symlinks = false;
        
        // เพิ่ม alias สำหรับ '@/...' ให้แน่นอนบนทุกแพลตฟอร์ม
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            '@': path.resolve(__dirname),
        };
        
        // เผื่อกรณี environment ไม่ได้ตั้งค่าชนิดไฟล์ครบ
        config.resolve.extensions = Array.from(new Set([...
            (config.resolve.extensions || []),
            '.ts', '.tsx', '.js', '.jsx'
        ]));
        
        return config;
    },
};

module.exports = nextConfig;
