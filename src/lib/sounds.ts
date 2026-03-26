"use client";

const AudioContext = typeof window !== "undefined" ? (window.AudioContext || (window as any).webkitAudioContext) : null;

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (!AudioContext) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, duration: number, volume: number = 0.08, type: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playAddSound() { playTone(880, 0.12); setTimeout(() => playTone(1100, 0.1), 80); }
export function playDoneSound() { playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 100); setTimeout(() => playTone(784, 0.15), 200); }
export function playDeleteSound() { playTone(300, 0.15, 0.06, "triangle"); }
export function playClickSound() { playTone(600, 0.05, 0.04); }
export function playErrorSound() { playTone(200, 0.2, 0.06, "sawtooth"); }
