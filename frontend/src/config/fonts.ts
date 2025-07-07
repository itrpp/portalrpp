import { Prompt, Inter } from "next/font/google";

// Font สำหรับภาษาไทย (default)
export const fontPrompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});

// Font สำหรับ sans-serif (ตัวเลือก)
export const fontSans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});
