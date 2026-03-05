/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src-ui/**/*.{js,jsx,ts,tsx}",
    "./src-ui/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sf-pro': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        'sf-mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace']
      },
      colors: {
        'system-blue': '#007AFF',
        'system-green': '#34C759',
        'system-red': '#FF3B30',
        'system-gray': '#8E8E93',
        'system-orange': '#FF9500',
        'system-purple': '#AF52DE',
        'system-pink': '#FF2D92',
        'system-teal': '#5AC8FA',
        'system-indigo': '#5856D6',
        'system-yellow': '#FFCC00',
        'macos-bg': 'rgba(255, 255, 255, 0.7)',
        'macos-bg-dark': 'rgba(30, 30, 30, 0.7)',
        'macos-sidebar': 'rgba(255, 255, 255, 0.8)',
        'macos-sidebar-dark': 'rgba(30, 30, 30, 0.8)'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      borderRadius: {
        'macos': '10px',
        'macos-sm': '8px',
        'macos-lg': '12px'
      },
      backdropBlur: {
        'macos': '20px'
      },
      animation: {
        'bounce-gentle': 'bounce 1s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'spring': 'spring 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
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
        spring: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
