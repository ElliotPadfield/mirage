/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src-ui/**/*.{js,jsx,ts,tsx}",
    "./src-ui/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'jakarta': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'accent': '#8B5CF6',
        'accent-dark': '#7C3AED',
        'success': '#14B8A6',
        'danger': '#EF4444',
        'warning': '#F59E0B',
        'surface': {
          DEFAULT: '#0F0F14',
          panel: '#0F0F14CC',
          subtle: '#FFFFFF08',
          hover: '#FFFFFF10',
        },
        'text': {
          primary: '#FFFFFF',
          secondary: '#D4D4D8',
          tertiary: '#A1A1AA',
          muted: '#71717A',
          dim: '#52525B',
        },
      },
      borderRadius: {
        'panel': '20px',
        'card': '16px',
        'pill': '100px',
      },
      backdropBlur: {
        'panel': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
      }
    }
  },
  plugins: []
}
