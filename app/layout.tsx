import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "FINDIT — Importa desde China al mejor precio",
    template: "%s | FINDIT",
  },
  description:
    "Consolida tu carga LCL desde China a Panamá. Tu precio baja en tiempo real conforme entra más volumen al pool. Transparencia total, ahorro garantizado.",
  keywords: ["importación", "china", "panamá", "LCL", "flete", "consolidado", "logística"],
  openGraph: {
    type: "website",
    locale: "es_PA",
    siteName: "FINDIT",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
