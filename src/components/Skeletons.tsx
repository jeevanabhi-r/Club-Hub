export function CardSkeleton() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/80 animate-pulse">
      <div className="h-48 bg-zinc-800"></div>
      <div className="p-5 space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
        <div className="h-6 bg-zinc-800 rounded w-3/4"></div>
        <div className="h-4 bg-zinc-800 rounded w-full"></div>
        <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
        <div className="pt-4 flex justify-between">
          <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center space-x-4 p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 animate-pulse">
          <div className="w-12 h-12 bg-zinc-800 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
