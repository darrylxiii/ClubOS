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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // === LUXURY TYPOGRAPHY SYSTEM (ARTIFACT B) ===
        // Display (Ceremonial)
        'display-xl': ['6rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }], // 96px
        'display-lg': ['4.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }], // 72px
        'display-md': ['3.75rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }], // 60px
        'display-sm': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }], // 48px

        // Heading (Structural)
        'heading-2xl': ['3rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 48px
        'heading-xl': ['2.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 40px
        'heading-lg': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 32px
        'heading-md': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 28px
        'heading-sm': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 24px
        'heading-xs': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 20px

        // Body (Content)
        'body-lg': ['1.125rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '400' }], // 18px
        'body-md': ['1rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '400' }], // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '400' }], // 14px

        // Label (Utility)
        'label-md': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }], // 13px
        'label-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }], // 12px
        'label-xs': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }], // 10px

        // === LEGACY / COMPATIBILITY (DEPRECATE PHASE 3) ===
        // Micro text (11px) - Badges, timestamps
        'micro': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        // Tiny text (12px) - Captions, help text - Aliased to xs
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        // Small body (14px) - Secondary text, dense lists
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        // Base body (16px) - Primary reading text
        'base': ['1rem', { lineHeight: '1.5rem' }],
        // Large body / Subtitles (18px)
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        // Card Headings (20px)
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        // Section Headings (24px)
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        // Page Titles (30px)
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        // Major Display (36px)
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        // Hero Display
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '7xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "color-1": "hsl(var(--color-1))",
        "color-2": "hsl(var(--color-2))",
        "color-3": "hsl(var(--color-3))",
        "color-4": "hsl(var(--color-4))",
        "color-5": "hsl(var(--color-5))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-card": "var(--gradient-card)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-mesh": "var(--gradient-mesh)",
      },
      boxShadow: {
        "glass-sm": "var(--shadow-glass-sm)",
        "glass-md": "var(--shadow-glass-md)",
        "glass-lg": "var(--shadow-glass-lg)",
        "glass-xl": "var(--shadow-glass-xl)",
        "float": "var(--shadow-float)",
        "inner": "var(--shadow-inner)",
        "glow": "var(--shadow-glow)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      letterSpacing: {
        tighter: "-0.05em",
        tight: "-0.025em",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "slide-up": {
          "0%": {
            transform: "translateY(100%)",
          },
          "100%": {
            transform: "translateY(0)",
          },
        },
        "bounce-in": {
          "0%": {
            transform: "scale(0.9)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.05)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "accordion-up": "accordion-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spin-slow": "spin 3s linear infinite",
        "pulse-subtle": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        rainbow: "rainbow var(--speed, 8s) infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
