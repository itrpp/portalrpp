import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        prompt: ["var(--font-prompt)", "Prompt", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "Fira Code", "ui-monospace"],
      },
    },
  },
  plugins: [
    heroui({
      defaultTheme: "light",
      themes: {
        light: {
          colors: {
            background: "#ffffff",
            foreground: "#0f172a",
            
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
              foreground: "#ffffff",
              DEFAULT: "#0ea5e9",
            },
            
            secondary: {
              50: '#f0fdf4',
              100: '#dcfce7',
              200: '#bbf7d0',
              300: '#86efac',
              400: '#4ade80',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d',
              800: '#166534',
              900: '#14532d',
              foreground: "#ffffff",
              DEFAULT: "#22c55e",
            },

            success: {
              50: '#f0fdf4',
              100: '#dcfce7',
              200: '#bbf7d0',
              300: '#86efac',
              400: '#4ade80',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d',
              800: '#166534',
              900: '#14532d',
              foreground: "#ffffff",
              DEFAULT: "#22c55e",
            },

            warning: {
              50: '#fffbeb',
              100: '#fef3c7',
              200: '#fde68a',
              300: '#fcd34d',
              400: '#fbbf24',
              500: '#f59e0b',
              600: '#d97706',
              700: '#b45309',
              800: '#92400e',
              900: '#78350f',
              foreground: "#ffffff",
              DEFAULT: "#f59e0b",
            },

            danger: {
              50: '#fef2f2',
              100: '#fee2e2',
              200: '#fecaca',
              300: '#fca5a5',
              400: '#f87171',
              500: '#ef4444',
              600: '#dc2626',
              700: '#b91c1c',
              800: '#991b1b',
              900: '#7f1d1d',
              foreground: "#ffffff",
              DEFAULT: "#ef4444",
            },
            
            default: {
              50: "#f8fafc",
              100: "#f1f5f9",
              200: "#e2e8f0",
              300: "#cbd5e1",
              400: "#94a3b8",
              500: "#64748b",
              600: "#475569",
              700: "#334155",
              800: "#1e293b",
              900: "#0f172a",
              foreground: "#0f172a",
              DEFAULT: "#f1f5f9",
            },
            
            focus: "#0ea5e9",
            
            divider: {
              DEFAULT: "#e2e8f0",
            },
            
            content1: {
              DEFAULT: "#ffffff",
              foreground: "#0f172a",
            },
            content2: {
              DEFAULT: "#f8fafc",
              foreground: "#0f172a",
            },
            content3: {
              DEFAULT: "#f1f5f9",
              foreground: "#475569",
            },
            content4: {
              DEFAULT: "#e2e8f0",
              foreground: "#64748b",
            },
          },
        },
        dark: {
          colors: {
            background: "#2a2a2a",
            foreground: "#ffffff",
            
            primary: {
              50: '#0c4a6e',
              100: '#075985',
              200: '#0369a1',
              300: '#0284c7',
              400: '#0ea5e9',
              500: '#38bdf8',
              600: '#7dd3fc',
              700: '#bae6fd',
              800: '#e0f2fe',
              900: '#f0f9ff',
              foreground: "#0f172a",
              DEFAULT: "#38bdf8",
            },
            
            secondary: {
              50: '#14532d',
              100: '#166534',
              200: '#15803d',
              300: '#16a34a',
              400: '#22c55e',
              500: '#4ade80',
              600: '#86efac',
              700: '#bbf7d0',
              800: '#dcfce7',
              900: '#f0fdf4',
              foreground: "#0f172a",
              DEFAULT: "#4ade80",
            },

            success: {
              50: '#14532d',
              100: '#166534',
              200: '#15803d',
              300: '#16a34a',
              400: '#22c55e',
              500: '#4ade80',
              600: '#86efac',
              700: '#bbf7d0',
              800: '#dcfce7',
              900: '#f0fdf4',
              foreground: "#0f172a",
              DEFAULT: "#4ade80",
            },

            warning: {
              50: '#78350f',
              100: '#92400e',
              200: '#b45309',
              300: '#d97706',
              400: '#f59e0b',
              500: '#fbbf24',
              600: '#fcd34d',
              700: '#fde68a',
              800: '#fef3c7',
              900: '#fffbeb',
              foreground: "#0f172a",
              DEFAULT: "#fbbf24",
            },

            danger: {
              50: '#7f1d1d',
              100: '#991b1b',
              200: '#b91c1c',
              300: '#dc2626',
              400: '#ef4444',
              500: '#f87171',
              600: '#fca5a5',
              700: '#fecaca',
              800: '#fee2e2',
              900: '#fef2f2',
              foreground: "#0f172a",
              DEFAULT: "#f87171",
            },
            
            default: {
              50: "#1a1a1a",
              100: "#2a2a2a",
              200: "#3a3a3a",
              300: "#4a4a4a",
              400: "#5a5a5a",
              500: "#6a6a6a",
              600: "#7a7a7a",
              700: "#8a8a8a",
              800: "#9a9a9a",
              900: "#aaaaaa",
              foreground: "#ffffff",
              DEFAULT: "#2a2a2a",
            },
            
            focus: "#38bdf8",
            
            divider: {
              DEFAULT: "#4a4a4a",
            },
            
            content1: {
              DEFAULT: "#1a1a1a",
              foreground: "#ffffff",
            },
            content2: {
              DEFAULT: "#2a2a2a",
              foreground: "#ffffff",
            },
            content3: {
              DEFAULT: "#3a3a3a",
              foreground: "#d1d5db",
            },
            content4: {
              DEFAULT: "#4a4a4a",
              foreground: "#9ca3af",
            },
          },
        },
      },
    }),
  ],
};

module.exports = config;
