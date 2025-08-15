// tailwind.config.js
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}', // Scans src/app/ (layout.jsx, page.jsx, etc.)
    './src/components/**/*.{js,ts,jsx,tsx}', // Scans src/components/ (Navbar.jsx)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
