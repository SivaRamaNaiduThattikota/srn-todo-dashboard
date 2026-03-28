"use client";

import { ReactNode, useState, createContext, useContext } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorker";
import { PageTransition } from "@/components/PageTransition";

/* ── Sidebar collapse context — shared between Sidebar and ClientLayout ── */
export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() { return useContext(SidebarContext); }

export function ClientLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  /* Sidebar widths:
     - Desktop expanded:  224px  (lg+)
     - Desktop collapsed:  60px  (lg+, icon-only)
     - Tablet (md–lg):     60px  always icon-only (no collapse toggle)
  */
  const desktopMargin = collapsed ? "60px" : "224px";

  return (
    <ThemeProvider>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <ParticleBackground />

        {/* Desktop Sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content — left margin exactly matches sidebar width */}
        <main
          className="flex-1 min-h-screen pb-20 md:pb-0"
          style={{
            marginLeft: `clamp(60px, ${desktopMargin}, ${desktopMargin})`,
            transition: "margin-left 0.28s cubic-bezier(0.2,0.8,0.2,1)",
          }}
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
      </SidebarContext.Provider>
    </ThemeProvider>
  );
}
