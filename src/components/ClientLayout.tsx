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
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 md:ml-16 lg:ml-64 min-h-screen pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <div className="md:hidden"><MobileNav /></div>
      <ToastProvider />
      <KeyboardShortcuts />
      <ServiceWorkerRegistrar />
    </ThemeProvider>
  );
}
