export default function GuildLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-3.5 w-[420px] max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel p-4">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-3 h-6 w-16" />
            <div className="skeleton mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton mt-4 h-[180px] w-full" />
          </div>
          <div className="panel space-y-3 p-4">
            <div className="skeleton h-3 w-28" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-7 w-7 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-2.5 w-40" />
                  <div className="skeleton h-2.5 w-64 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="panel space-y-2.5 p-4">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-2.5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
