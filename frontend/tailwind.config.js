/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#014260",
          50: "#E6EEF2",
          100: "#CCDCE5",
          200: "#99B9CC",
          300: "#6696B2",
          400: "#337399",
          500: "#014260",
          600: "#01354D",
          700: "#01283A",
          800: "#001A26",
          900: "#000D13",
        },
        copper: {
          DEFAULT: "#FF8C42",
          50: "#FFF3EA",
          100: "#FFE3CC",
          400: "#FFA866",
          500: "#FF8C42",
          600: "#E66F22",
        },
        canvas: "#F7F9FA",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(1, 66, 96, 0.08), 0 1px 2px rgba(1, 66, 96, 0.06)",
        cardHover: "0 4px 12px rgba(1, 66, 96, 0.12)",
      },
    },
  },
  plugins: [],
};
