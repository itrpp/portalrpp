import {
  Fira_Code as FontMono,
  Prompt as FontPrompt,
  Inter as FontSans,
} from "next/font/google";

// Font Prompt สำหรับภาษาไทย - ใช้เป็น font หลัก
export const fontPrompt = FontPrompt({
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

// Font Inter สำหรับภาษาอังกฤษ
export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Font Fira Code สำหรับ code/monospace
export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
