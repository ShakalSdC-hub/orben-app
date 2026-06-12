import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: "#041632",
        "on-primary": "#ffffff",
        "primary-container": "#1b2b48",
        "on-primary-container": "#8393b5",
        "primary-fixed": "#d7e2ff",
        "primary-fixed-dim": "#b7c7eb",
        "on-primary-fixed": "#091b37",
        "on-primary-fixed-variant": "#374765",
        "inverse-primary": "#b7c7eb",

        // Secondary (terracota/copper — identidade ORBEN)
        secondary: "#9a4523",
        "on-secondary": "#ffffff",
        "secondary-container": "#ff946c",
        "on-secondary-container": "#772b0a",
        "secondary-fixed": "#ffdbcf",
        "secondary-fixed-dim": "#ffb59a",
        "on-secondary-fixed": "#380d00",
        "on-secondary-fixed-variant": "#7b2f0e",

        // Tertiary (verde-água — sucesso/concluído)
        tertiary: "#001a1a",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#003131",
        "on-tertiary-container": "#31a1a1",
        "tertiary-fixed": "#8cf3f3",
        "tertiary-fixed-dim": "#6fd7d6",
        "on-tertiary-fixed": "#002020",
        "on-tertiary-fixed-variant": "#004f4f",

        // Error
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // Surfaces / Background
        background: "#f8f9ff",
        "on-background": "#0b1c30",
        surface: "#f8f9ff",
        "on-surface": "#0b1c30",
        "surface-bright": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-variant": "#d3e4fe",
        "on-surface-variant": "#44474d",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-tint": "#4f5e7e",

        // Outline / Inverse
        outline: "#75777e",
        "outline-variant": "#c5c6ce",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      spacing: {
        xs: "4px",
        base: "4px",
        sm: "8px",
        md: "16px",
        gutter: "16px",
        lg: "24px",
        margin: "24px",
        xl: "32px",
        "2xl": "48px",
        "sidebar-width": "260px",
      },
      fontFamily: {
        "display-lg": ["Inter"],
        "headline-lg": ["Inter"],
        "headline-lg-mobile": ["Inter"],
        "headline-md": ["Inter"],
        "title-lg": ["Inter"],
        "body-lg": ["Inter"],
        "body-md": ["Inter"],
        "body-sm": ["Inter"],
        "label-md": ["JetBrains Mono"],
        "label-sm": ["JetBrains Mono"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
