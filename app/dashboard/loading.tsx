export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-44" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel p-4">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-3 h-6 w-14" />
            <div className="skeleton mt-2 h-2.5 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="skeleton h-14 w-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-24" />
                </div>
              </div>
              <div className="skeleton h-9 w-full" />
              <div className="skeleton h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="panel space-y-2.5 p-4">
              <div className="skeleton h-3 w-24" />
              {[0, 1, 2].map((j) => (
                <div key={j} className="skeleton h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
