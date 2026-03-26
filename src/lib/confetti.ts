"use client";

export async function fireConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6ee7b7", "#60a5fa", "#fbbf24", "#f87171", "#c084fc"],
      ticks: 200,
      gravity: 1.2,
      scalar: 0.9,
    });
  } catch {}
}
