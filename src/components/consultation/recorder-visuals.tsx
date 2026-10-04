import { cn } from "@/lib/utils";

export function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  const bars = levels.length ? levels : Array.from({ length: 48 }, () => 0.04);
  return (
    <div className="flex h-24 w-full items-center justify-center gap-[3px] rounded-xl bg-muted/60 px-4">
      {bars.map((level, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-[height] duration-100 ease-out",
            active ? "bg-primary" : "bg-muted-foreground/40",
          )}
          style={{ height: `${Math.max(4, level * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function MicPulse({ active, paused }: { active: boolean; paused: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center">
      {active && !paused && (
        <>
          <span className="absolute inline-flex size-24 animate-ping rounded-full bg-primary/25" />
          <span className="absolute inline-flex size-20 animate-pulse rounded-full bg-primary/20" />
        </>
      )}
      <span
        className={cn(
          "relative flex size-16 items-center justify-center rounded-full text-primary-foreground transition-colors",
          active ? (paused ? "bg-warning" : "gradient-clinical") : "bg-muted-foreground/30",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v3" />
        </svg>
      </span>
    </div>
  );
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
