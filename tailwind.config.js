/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'system-ui', 'sans-serif'],
        mono: ['"VT323"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        silk: ['"Silkscreen"', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        canvas: {
          DEFAULT: '#FFFFFF',
          dark: '#161513',
        },
        ink: {
          DEFAULT: '#21201E',
          dark: '#E1E1E0',
        },
        line: {
          DEFAULT: '#E2E2E0',
          dark: '#312E2B',
        },
        muted: {
          DEFAULT: '#797673',
          dark: '#A3A19F',
        },
        accent: {
          DEFAULT: '#81B64C',
          hover: '#95BB72',
          soft: '#F4F7F1',
          softDark: '#22271F',
        },
        chip: {
          DEFAULT: '#F1F1F1',
          dark: '#262421',
        },
        pixel: {
          green: '#81B64C',
          red: '#FA463A',
          yellow: '#F2B827',
          blue: '#35A2FF',
          cyan: '#00C2C2',
          magenta: '#C735C7',
        },
      },
      boxShadow: {
        card: '0 8px 30px rgba(0, 0, 0, 0.08)',
        cardDark: '0 8px 30px rgba(0, 0, 0, 0.4)',
        press: '0 2px 4px rgba(0, 0, 0, 0.06)',
        pressDark: '0 2px 4px rgba(0, 0, 0, 0.3)',
        thumb: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      transitionTimingFunction: {
        snappy: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        boing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pop: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        fadeUp: 'fadeUp 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
