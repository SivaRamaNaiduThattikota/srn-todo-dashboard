"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorker";
import { PageTransition } from "@/components/PageTransition";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ParticleBackground />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content — offset for sidebar */}
      <main
        className="flex-1 md:ml-[60px] lg:ml-[220px] min-h-screen pb-20 md:pb-0"
        style={{ transition: "margin-left 0.3s cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      <ToastProvider />
      <KeyboardShortcuts />
      <ServiceWorkerRegistrar />
    </ThemeProvider>
  );
}
