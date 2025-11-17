import { Fira_Code as FontMono, Prompt as FontSans } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});
