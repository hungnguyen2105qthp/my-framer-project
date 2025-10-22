import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "*.{js,ts,jsx,tsx,mdx}"],
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
        sans: ['var(--font-poppins)', 'sans-serif'], // Apply Poppins as the default sans-serif font
      },
      colors: {
        // Custom background colors matching the provided images
        'custom-light-bg': '#f5f5f5', // Off-white background
        'custom-dark-bg': '#1a1a1a', // Dark background

        // Updated pink accent colors (lighter, not red)
        'primary-pink': '#FF69B4', // Hot Pink - a vibrant but clearly pink shade
        'accent-pink': '#FFE0E6', // Very pale pink for backgrounds/tags

        'accent-green': '#d1f7e0', // Green for highlights (kept as is)
        'accent-yellow': '#FFD700', // Gold/Yellow for underlines in "How it Works"

        'text-light-primary': '#1a1a1a', // Main text color on light backgrounds
        'text-dark-primary': '#ffffff', // Main text color on dark backgrounds
        'text-light-muted': '#4a4a4a', // Muted text on light backgrounds
        'text-dark-muted': '#a0a0a0', // Muted text on dark backgrounds

        // Card background colors
        'card-light-bg': '#ffffff', // Card background on dark sections
        'card-dark-bg': '#1a1a1a', // Card background on light sections

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
