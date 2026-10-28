import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        paper: "var(--paper)",
        "paper-ink": "var(--paper-ink)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        sienna: {
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Charter', 'Georgia', '"Iowan Old Style"', 'Palatino', 'ui-serif', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      boxShadow: {
        glow: '0 0 24px -4px rgba(99, 102, 241, 0.25), 0 8px 24px -8px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
        'slide-up': 'slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
export default config;
