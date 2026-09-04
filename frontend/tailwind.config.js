const { heroui } = require('@heroui/theme');

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // มาตรฐาน responsive ของโปรเจกต์ (ดู frontend/lib/breakpoints.ts)
      screens: {
        sm: '640px', // มือถือแนวนอน / Tablet ขนาดเล็ก
        md: '768px', // Tablet แนวตั้ง (เช่น iPad)
        lg: '1024px', // Notebook / Tablet แนวนอน
        xl: '1280px', // PC (Desktop จอมาตรฐาน)
        '2xl': '1536px', // PC จอใหญ่ / Ultrawide
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Prompt', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [heroui()],
};

module.exports = config;
