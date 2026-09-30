/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
      },
      colors: {
        // TailAdmin primary palette
        primary:    '#3C50E0',
        'primary-dark': '#142BA2',
        secondary:  '#80CAEE',

        // Sidebar / dark surfaces
        boxdark:    '#24303F',
        'boxdark-2': '#1A222C',

        // Body text
        body:       '#64748B',
        bodydark:   '#AEB7C0',
        bodydark2:  '#8A99AF',

        // Borders / stroke
        stroke:     '#E2E8F0',
        strokedark: '#2E3A47',

        // Page backgrounds
        whiten:     '#F1F5F9',
        whiter:     '#F5F7FD',

        // Status colors (TailAdmin meta)
        success:    '#219653',
        danger:     '#D34053',
        warning:    '#FFA70B',

        meta: {
          1:  '#DC3545',
          2:  '#EFF2F7',
          3:  '#10B981',
          4:  '#313D4A',
          5:  '#259AE6',
          6:  '#FFBA00',
          7:  '#FF6766',
          8:  '#F0950C',
          9:  '#E5E7EB',
          10: '#0EA5E9',
        },
      },
    },
  },
  plugins: [],
};
