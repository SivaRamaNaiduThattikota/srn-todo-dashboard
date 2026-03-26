import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorker";

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
        <ThemeProvider>
          <ParticleBackground />
          <div className="hidden md:block"><Sidebar /></div>
          <main className="flex-1 md:ml-16 lg:ml-64 min-h-screen pb-20 md:pb-0">{children}</main>
          <div className="md:hidden"><MobileNav /></div>
          <ToastProvider />
          <KeyboardShortcuts />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
