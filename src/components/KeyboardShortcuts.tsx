"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "n":
          // Dispatch custom event for new task
          window.dispatchEvent(new CustomEvent("srn:new-task"));
          break;
        case "/":
          e.preventDefault();
          // Focus search input
          const search = document.querySelector<HTMLInputElement>('[placeholder*="Search"]');
          search?.focus();
          break;
        case "b":
          router.push("/board");
          break;
        case "a":
          router.push("/analytics");
          break;
        case "t":
          router.push("/");
          break;
        case "i":
          router.push("/assistant");
          break;
        case "escape":
          // Dispatch custom event for closing modals
          window.dispatchEvent(new CustomEvent("srn:escape"));
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
