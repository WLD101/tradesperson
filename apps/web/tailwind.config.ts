import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#191c1e",
        mist: "#eef2ff",
        sand: "#f7f9fb",
        stitch: {
          background: "#f7f9fb",
          surface: "#ffffff",
          "surface-low": "#f2f4f6",
          "surface-container": "#eceef0",
          "surface-high": "#e6e8ea",
          "surface-highest": "#e0e3e5",
          nav: "#0F172A",
          primary: "#000000",
          "primary-container": "#131b2e",
          emerald: "#10B981",
          secondary: "#006c49",
          "secondary-container": "#6cf8bb",
          outline: "#76777d",
          "outline-variant": "#c6c6cd",
          error: "#ba1a1a",
          "error-container": "#ffdad6",
        },
      },
      fontFamily: {
        sans: ["var(--font-ui)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-md": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "table-data": ["13px", { lineHeight: "16px", fontWeight: "450" }],
        "label-caps": ["11px", { lineHeight: "12px", letterSpacing: "0.05em", fontWeight: "700" }],
        "mono-metric": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      spacing: {
        "sidebar-width": "260px",
        "panel-width": "420px",
        "content-max": "1440px",
        "stitch-xs": "0.25rem",
        "stitch-sm": "0.5rem",
        "stitch-md": "1rem",
        "stitch-lg": "1.5rem",
        "stitch-xl": "2.5rem",
      },
      borderRadius: {
        stitch: "0.75rem",
        "stitch-sm": "0.375rem",
        "stitch-lg": "1rem",
        "stitch-xl": "1.5rem",
      },
      boxShadow: {
        stitch: "0 1px 3px rgba(15, 23, 42, 0.05)",
        "stitch-overlay": "0 10px 25px rgba(15, 23, 42, 0.1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
