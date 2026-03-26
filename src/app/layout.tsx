import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "SRN Command Center",
  description: "Real-time task dashboard with glassmorphism UI",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SRN Command" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="green" data-mode="dark">
      <body className="min-h-screen flex">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

