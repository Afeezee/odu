import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oui: {
          maroon: {
            DEFAULT: "#7A1F2E",
            50: "#FBEEF0",
            100: "#F4D4D9",
            200: "#E5A2AC",
            300: "#D06F7E",
            400: "#B04756",
            500: "#7A1F2E",
            600: "#661924",
            700: "#4E131C",
            800: "#360D13",
            900: "#20080C",
          },
          gold: {
            DEFAULT: "#D4A017",
            50: "#FBF3D8",
            100: "#F7E7B0",
            200: "#EFD070",
            300: "#E3B93E",
            400: "#D4A017",
            500: "#B08411",
            600: "#8A680E",
            700: "#634A0A",
            800: "#3D2E06",
            900: "#1F1703",
          },
          navy: {
            DEFAULT: "#1B3A5C",
            50: "#E4EBF3",
            100: "#C4D2E1",
            200: "#8FA9C4",
            300: "#5A80A6",
            400: "#2E5A83",
            500: "#1B3A5C",
            600: "#152F4A",
            700: "#0F2337",
            800: "#0A1725",
            900: "#050C13",
          },
          bg: "#FAF7F2",
          "bg-dark": "#141014",
          surface: "#FFFFFF",
          "surface-dark": "#1E1A1E",
          border: "#EDE5D8",
          "border-dark": "#2E2830",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["ui-serif", "Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
