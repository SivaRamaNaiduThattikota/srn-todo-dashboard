"use client";

interface Props {
  lastEvent: string | null;
}

export function EventLog({ lastEvent }: Props) {
  if (!lastEvent) return null;

  return (
    <div className="mb-5 animate-fade-in-up">
      <div className="liquid-glass rounded-xl px-4 py-3 flex items-center gap-3 hover-glow">
        <div className="relative flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent block" />
          <span className="absolute inset-0 w-2 h-2 rounded-full bg-accent animate-ping opacity-40" />
        </div>
        <span className="text-xs font-mono text-accent/90 truncate">
          {lastEvent}
        </span>
      </div>
    </div>
  );
}
