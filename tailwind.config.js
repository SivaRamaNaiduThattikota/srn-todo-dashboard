/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      /* ── Override Tailwind's default fontSize scale to readable sizes ── */
      /* This means text-xs, text-sm, text-base etc. all produce larger text */
      fontSize: {
        "xs":   ["12.5px", { lineHeight: "1.5" }],   /* was 12px */
        "sm":   ["14px",   { lineHeight: "1.5" }],   /* was 13.5px — this is the key one */
        "base": ["15.5px", { lineHeight: "1.55" }],  /* was 16px but too large for UI labels */
        "md":   ["16px",   { lineHeight: "1.5" }],   /* custom step */
        "lg":   ["18px",   { lineHeight: "1.45" }],  /* was 18px */
        "xl":   ["20px",   { lineHeight: "1.4" }],   /* was 20px */
        "2xl":  ["24px",   { lineHeight: "1.35" }],  /* was 24px */
        "3xl":  ["30px",   { lineHeight: "1.3" }],   /* was 30px */
        "4xl":  ["36px",   { lineHeight: "1.25" }],  /* was 36px */
        "5xl":  ["48px",   { lineHeight: "1.2" }],   /* was 48px */
      },

      colors: {
        glass: {
          fill:    "var(--glass-fill)",
          hover:   "var(--glass-fill-hover)",
          active:  "var(--glass-fill-active)",
          deep:    "var(--glass-fill-deep)",
          sidebar: "var(--glass-fill-sidebar)",
        },
        border: {
          glass:   "var(--glass-border)",
          hover:   "var(--glass-border-hover)",
          top:     "var(--glass-border-top)",
          bottom:  "var(--glass-border-bottom)",
          subtle:  "var(--glass-border-subtle)",
        },
        surface: {
          0: "#08080c",
          1: "#0e0e14",
          2: "#161620",
          3: "#1e1e2a",
          4: "#262634",
        },
        accent: {
          DEFAULT: "var(--accent)",
          muted:   "var(--accent-muted)",
          dim:     "var(--accent-dim)",
          glow:    "var(--accent-glow)",
        },
        status: {
          pending:     "#f5a623",
          in_progress: "#4da6ff",
          done:        "#5ecf95",
          blocked:     "#ff6b6b",
        },
        priority: {
          critical: "#ff6b6b",
          high:     "#ff9500",
          medium:   "#f5a623",
          low:      "#8e8e93",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          tertiary:  "var(--text-tertiary)",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "SF Pro Display", "Helvetica Neue", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "2xl":  "16px",
        "3xl":  "22px",
        "4xl":  "28px",
        "5xl":  "36px",
      },
      backdropBlur: {
        xs:  "6px",
        sm:  "12px",
        md:  "24px",
        lg:  "40px",
        xl:  "60px",
      },
      boxShadow: {
        glass:      "var(--shadow-md)",
        "glass-lg": "var(--shadow-lg)",
        "glass-xl": "var(--shadow-xl)",
        accent:     "0 4px 14px var(--accent-glow)",
      },
      animation: {
        "fade-in":    "fadeIn 0.22s ease both",
        "fade-in-up": "fadeInUp 0.32s cubic-bezier(0.2,0.8,0.2,1) both",
        "slide-up":   "slideUp 0.32s cubic-bezier(0.34,1.4,0.64,1) both",
        "scale-in":   "scaleIn 0.28s cubic-bezier(0.34,1.4,0.64,1) both",
        "float":      "float 3s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "live-pulse": "livePulse 2.2s ease-in-out infinite",
        "shimmer":    "glassShimmer 1.8s ease-in-out infinite",
        "spin-slow":  "spinSlow 8s linear infinite",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(10px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(18px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        glassShimmer: {
          "0%":   { transform: "translateX(-100%) skewX(-8deg)" },
          "100%": { transform: "translateX(200%) skewX(-8deg)" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
