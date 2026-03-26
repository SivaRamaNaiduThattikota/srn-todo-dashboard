"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AccentTheme = "green" | "blue" | "purple" | "orange" | "pink" | "cyan";
type Mode = "dark" | "light";

const ThemeContext = createContext<{
  accent: AccentTheme;
  mode: Mode;
  setAccent: (t: AccentTheme) => void;
  toggleMode: () => void;
}>({ accent: "green", mode: "dark", setAccent: () => {}, toggleMode: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentTheme>("green");
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    try {
      const savedAccent = localStorage.getItem("srn-accent") as AccentTheme | null;
      const savedMode = localStorage.getItem("srn-mode") as Mode | null;
      if (savedAccent) {
        setAccentState(savedAccent);
        document.documentElement.setAttribute("data-theme", savedAccent);
      }
      if (savedMode) {
        setModeState(savedMode);
        document.documentElement.setAttribute("data-mode", savedMode);
      }
    } catch {}
  }, []);

  const setAccent = (t: AccentTheme) => {
    setAccentState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("srn-accent", t); } catch {}
  };

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setModeState(next);
    document.documentElement.setAttribute("data-mode", next);
    try { localStorage.setItem("srn-mode", next); } catch {}
  };

  return (
    <ThemeContext.Provider value={{ accent, mode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
