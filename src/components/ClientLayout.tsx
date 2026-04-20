"use client";

import { ReactNode, useState, createContext, useContext, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorker";
import { PageTransition } from "@/components/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import { usePathname } from "next/navigation";

export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() { return useContext(SidebarContext); }

export function ClientLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLg, setIsLg] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const pathname = usePathname();
  const rafRef = useRef<number | null>(null);
  const mxRef  = useRef(0.5);
  const myRef  = useRef(0.0);

  // ── ⌘K / Ctrl+K: open command palette ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    // Also listen for programmatic open from KeyboardShortcuts
    const openHandler = () => setCmdOpen(true);
    window.addEventListener("srn:open-cmd", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("srn:open-cmd", openHandler);
    };
  }, []);

  // ── System 3: Motion-reactive specular ──────────────────────────────
  // Tracks cursor position and updates --mx / --my CSS vars on :root.
  // Throttled via rAF so it never blocks the main thread.
  useEffect(() => {
    const root = document.documentElement;
    const onMove = (e: MouseEvent) => {
      mxRef.current = e.clientX / window.innerWidth;
      myRef.current = e.clientY / window.innerHeight;
      if (rafRef.current) return; // already queued
      rafRef.current = requestAnimationFrame(() => {
        root.style.setProperty("--mx", mxRef.current.toFixed(3));
        root.style.setProperty("--my", myRef.current.toFixed(3));
        rafRef.current = null;
      });
    };
    // Mobile: use device tilt for the same effect
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      mxRef.current = Math.min(Math.max((e.gamma + 45) / 90, 0), 1);
      myRef.current = Math.min(Math.max((e.beta - 20) / 60, 0), 1);
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        root.style.setProperty("--mx", mxRef.current.toFixed(3));
        root.style.setProperty("--my", myRef.current.toFixed(3));
        rafRef.current = null;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── System 6: Liquid press on all interactive elements ──────────────
  // Delegates from body — catches any .cc-btn, .cc-tile, .cc-habit tap.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>(".cc-btn, .cc-tile, .cc-habit, .hover-lift");
      if (!el) return;
      el.classList.remove("lp-active");
      void el.offsetWidth; // force reflow
      el.classList.add("lp-active");
      const done = () => {
        el.classList.remove("lp-active");
        el.removeEventListener("pointerup",     done);
        el.removeEventListener("pointercancel", done);
      };
      el.addEventListener("pointerup",     done, { once: true });
      el.addEventListener("pointercancel", done, { once: true });
      setTimeout(() => el.classList.remove("lp-active"), 520);
    };
    document.body.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.body.removeEventListener("pointerdown", onDown);
  }, []);

  // ── System 4 extension: Ambient tinting ───────────────────────────
  // Reads accent hue and writes --ambient-tint CSS var.
  // Cards with .ambient-tint class pick up a very faint hue overlay.
  // Re-runs whenever data-theme attribute changes.
  useEffect(() => {
    const root = document.documentElement;
    const updateTint = () => {
      const h = getComputedStyle(root).getPropertyValue("--accent-h").trim() || "160";
      const s = getComputedStyle(root).getPropertyValue("--accent-s").trim() || "65%";
      const l = getComputedStyle(root).getPropertyValue("--accent-l").trim() || "62%";
      root.style.setProperty("--ambient-tint", `hsla(${h}, ${s}, ${l}, 0.08)`);
    };
    updateTint();
    const obs = new MutationObserver(updateTint);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // ── System 7: Fluid page transitions ──────────────────────────────
  // On each route change, apply page-enter class to <main>.
  // Framer Motion handles the opacity fade; CSS handles blur+scale morph.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.classList.remove("page-enter");
    void main.offsetWidth;
    main.classList.add("page-enter");
    const tid = setTimeout(() => main.classList.remove("page-enter"), 480);
    return () => clearTimeout(tid);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
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
          ref={mainRef}
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
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </SidebarContext.Provider>
    </ThemeProvider>
  );
}
