/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        info: { DEFAULT: '#2563EB', bg: '#DBEAFE' },
        success: { DEFAULT: '#16A34A', bg: '#DCFCE7' },
        warning: { DEFAULT: '#EA580C', bg: '#FFEDD5' },
        danger: { DEFAULT: '#DC2626', bg: '#FEE2E2' },
        'bg-page': '#F5F6FA',
        'bg-surface': '#FFFFFF',
        'bg-sidebar': '#0F1B3D',
        border: '#E5E7EB',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
      },
      borderRadius: {
        card: '12px',
        badge: '8px',
      },
      fontSize: {
        display: ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        heading: ['17px', { lineHeight: '1.4', fontWeight: '600' }],
        stat: ['30px', { lineHeight: '1.2', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
