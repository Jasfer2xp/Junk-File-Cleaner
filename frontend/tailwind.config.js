module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f0f1a",
          surface: "#1a1a2e",
          card: "#16213e",
          border: "#0f3460",
        },
        accent: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
          light: "#818cf8",
        },
        danger: {
          DEFAULT: "#ef4444",
          hover: "#dc2626",
        },
        success: {
          DEFAULT: "#10b981",
          hover: "#059669",
        },
        warning: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 2s linear infinite",
        shimmer: "shimmer 2s infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
