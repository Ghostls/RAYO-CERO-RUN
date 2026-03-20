import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Estética Apple: SF Pro es el estándar, Inter es el fallback perfecto
        sans: ['SF Pro Display', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Identidad Rayo Cero: Azul Naval Profundo
        primary: {
          DEFAULT: "#001F3F", // Naval Blue
          foreground: "#FFFFFF",
        },
        // Acentuaciones y Liquid Glass
        secondary: {
          DEFAULT: "rgba(255, 255, 255, 0.1)", // Glass effect base
          foreground: "#001F3F",
        },
        accent: {
          DEFAULT: "#FFFFFF", // Blanco puro para contrastes
          foreground: "#001F3F",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgba(0, 31, 63, 0.05)",
          foreground: "#667085",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.8)", // Frosted glass card
          foreground: "#001F3F",
        },
      },
      borderRadius: {
        // Bordes suaves estilo iOS/Apple
        lg: "20px",
        md: "12px",
        sm: "8px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "liquid-morph": {
          "0%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "50%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "liquid-morph": "liquid-morph 8s ease-in-out infinite",
      },
      // Soporte para backdrop blur avanzado (Liquid Glass)
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;