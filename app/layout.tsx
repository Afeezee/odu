import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odu — OUI Intelligent Assistant",
  description:
    "The intelligent assistant for Oduduwa University. Ask about programmes, fees, admissions, staff, and policies.",
};

// Read theme preference before React hydrates to avoid a light→dark flash.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('odu-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
