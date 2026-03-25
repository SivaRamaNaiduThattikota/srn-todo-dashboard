/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#0a0a0b",
          1: "#111113",
          2: "#1a1a1e",
          3: "#232328",
          4: "#2c2c33",
        },
        accent: {
          DEFAULT: "#6ee7b7",
          dim: "#34d399",
          muted: "rgba(110, 231, 183, 0.12)",
        },
        status: {
          pending: "#fbbf24",
          in_progress: "#60a5fa",
          done: "#6ee7b7",
          blocked: "#f87171",
        },
        priority: {
          critical: "#f87171",
          high: "#fb923c",
          medium: "#fbbf24",
          low: "#94a3b8",
        },
        text: {
          primary: "#e4e4e7",
          secondary: "#71717a",
          muted: "#52525b",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
