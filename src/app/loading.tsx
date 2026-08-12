export default function Loading() {
  return (
    <div aria-label="Laddar sida" aria-live="polite" className="animate-pulse">
      <div className="mb-5 flex items-center gap-3">
        <div className="size-9 shrink-0 rounded-[14px] bg-secondary" />
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-full bg-secondary" />
          <div className="h-3 w-40 rounded-full bg-secondary" />
        </div>
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-20 rounded-[24px] border border-border bg-card"
          />
        ))}
      </div>
      <span className="sr-only">Laddar…</span>
    </div>
  );
}
