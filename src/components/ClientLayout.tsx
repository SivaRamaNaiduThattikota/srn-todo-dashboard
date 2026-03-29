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

export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() { return useContext(SidebarContext); }

export function ClientLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLg, setIsLg] = useState(true); // default true to avoid flash on desktop

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /*
    Direct marginLeft — no CSS vars, no media query string injection.
    JS state is always in sync with sidebar width.

    Sidebar width logic (must match Sidebar.tsx exactly):
      - md (768-1023px): always 60px  — tablet, no collapse
      - lg+ (1024px+):   224px expanded | 60px collapsed
  */
  const getMarginLeft = () => {
    if (typeof window === "undefined") return "224px"; // SSR default
    if (window.innerWidth < 768) return "0px";         // mobile: no sidebar
    if (window.innerWidth < 1024) return "60px";       // tablet: always 60px
    return collapsed ? "60px" : "224px";               // desktop: respects collapse
  };

  const [marginLeft, setMarginLeft] = useState("224px");

  useEffect(() => {
    const update = () => setMarginLeft(getMarginLeft());
    update(); // run immediately
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [collapsed, isLg]);

  // Also update when collapsed changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) { setMarginLeft("0px"); return; }
    if (window.innerWidth < 1024) { setMarginLeft("60px"); return; }
    setMarginLeft(collapsed ? "60px" : "224px");
  }, [collapsed]);

  return (
    <ThemeProvider>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <ParticleBackground />

        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content — margin matches sidebar exactly */}
        <main
          className="flex-1 min-h-screen pb-20 md:pb-0"
          style={{
            marginLeft,
            transition: "margin-left 0.28s cubic-bezier(0.2,0.8,0.2,1)",
            overflowX: "hidden",   // ← ADD THIS
            maxWidth: "100vw",     // ← ADD THIS
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
