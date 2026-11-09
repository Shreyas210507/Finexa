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
          soft: "rgba(72, 213, 151, 0.15)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          soft: "rgba(240, 120, 120, 0.15)",
        },
        fintech: {
          bg: "#111019",
          sidebar: "#191823",
          card: "#201F2B",
          cardElevated: "#272532",
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
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      backgroundImage: {
        "fintech-ai": "linear-gradient(135deg, #1C1936 0%, #221D42 50%, #17152B 100%)",
        "fintech-ai-glow": "radial-gradient(circle at 50% 0%, rgba(139, 124, 255, 0.25) 0%, transparent 70%)",
        "fintech-gradient": "linear-gradient(135deg, #8B7CFF 0%, #A78BFA 100%)",
        "fintech-pill": "linear-gradient(135deg, rgba(139, 124, 255, 0.2) 0%, rgba(167, 139, 250, 0.1) 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
