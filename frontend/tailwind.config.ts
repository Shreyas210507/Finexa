import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        panel: "var(--panel)",
        card: {
          DEFAULT: "var(--card)",
          elevated: "var(--card-elevated)",
          foreground: "var(--card-foreground)",
          border: "var(--card-border)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        positive: {
          DEFAULT: "var(--positive)",
          soft: "rgba(52, 211, 153, 0.15)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          soft: "rgba(240, 120, 120, 0.15)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "rgba(245, 158, 11, 0.15)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "rgba(129, 140, 248, 0.15)",
        },
        fintech: {
          bg: "#050507",
          sidebar: "#0A0A0F",
          card: "rgba(255, 255, 255, 0.02)",
          cardElevated: "rgba(255, 255, 255, 0.04)",
          violet: "#4318FF",
          cyan: "#00F0FF",
          emerald: "#34D399",
          purple: "#8B7CFF",
          purpleLight: "#A78BFA",
          green: "#48D597",
          red: "#F07878",
          text: "#F5F4FA",
          muted: "#9693A5",
          border: "rgba(255, 255, 255, 0.07)",
        },
      },
      borderRadius: {
        finexa: "16px",
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
        pill: "9999px",
        lg: "14px",
        md: "10px",
        sm: "8px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "fintech-ai": "linear-gradient(135deg, #1C1936 0%, #221D42 50%, #17152B 100%)",
        "fintech-ai-glow": "radial-gradient(circle at 50% 0%, rgba(67, 24, 255, 0.25) 0%, transparent 70%)",
        "fintech-gradient": "linear-gradient(135deg, #4318FF 0%, #00F0FF 100%)",
        "fintech-pill": "linear-gradient(135deg, rgba(67, 24, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        "shimmer-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "shimmer-rotate": "shimmer-rotate 8s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
