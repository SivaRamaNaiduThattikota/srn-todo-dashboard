"use client";

interface Props {
  lastEvent: string | null;
}

export function EventLog({ lastEvent }: Props) {
  if (!lastEvent) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <div className="bg-accent-muted border border-accent/10 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <span className="live-dot w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        <span className="text-xs font-mono text-accent truncate">{lastEvent}</span>
      </div>
    </div>
  );
}
