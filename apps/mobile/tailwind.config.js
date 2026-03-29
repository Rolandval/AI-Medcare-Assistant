/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Health status colors
        health: {
          good: "#22c55e",      // green-500
          warning: "#f59e0b",   // amber-500
          danger: "#ef4444",    // red-500
          neutral: "#6b7280",   // gray-500
        },
        // Brand colors
        brand: {
          primary: "#3b82f6",   // blue-500
          dark: "#1e40af",      // blue-800
          light: "#dbeafe",     // blue-100
        },
      },
      fontSize: {
        // Larger base sizes for accessibility (elderly friendly)
        "xs": ["13px", "18px"],
        "sm": ["15px", "22px"],
        "base": ["17px", "25px"],
        "lg": ["19px", "28px"],
        "xl": ["22px", "32px"],
        "2xl": ["26px", "36px"],
        "3xl": ["32px", "42px"],
        "4xl": ["40px", "50px"],
      },
    },
  },
  plugins: [],
};
