"use client";

import { ReactNode, useState, createContext, useContext, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorker";
import { PageTransition } from "@/components/PageTransition";

/* ── Sidebar context ── */
export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() { return useContext(SidebarContext); }

export function ClientLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLg, setIsLg] = useState(false);

  /* Track lg breakpoint here too so margin is always correct */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /*
    Actual sidebar pixel width:
      - Mobile (< 768px):  0  (sidebar hidden, mobile nav used)
      - Tablet (768-1023): 60px always (icon-only, no collapse)
      - Desktop (1024px+): 224px expanded OR 60px collapsed
  */
  const sidebarWidth = !isLg ? "60px" : collapsed ? "60px" : "224px";

  return (
    <ThemeProvider>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <ParticleBackground />

        {/* Desktop/tablet sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main — marginLeft matches sidebar width exactly */}
        <main
          className="flex-1 min-h-screen pb-20 md:pb-0"
          style={{
            marginLeft: `var(--sidebar-ml, 0px)`,
            transition: "margin-left 0.28s cubic-bezier(0.2,0.8,0.2,1)",
            /* We set the CSS var so SSR and client both agree */
          }}
        >
          {/* Inline style tag to drive --sidebar-ml dynamically */}
          <style>{`
            @media (max-width: 767px) { :root { --sidebar-ml: 0px; } }
            @media (min-width: 768px) and (max-width: 1023px) { :root { --sidebar-ml: 60px; } }
            @media (min-width: 1024px) { :root { --sidebar-ml: ${collapsed ? "60px" : "224px"}; } }
          `}</style>
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Mobile nav */}
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
