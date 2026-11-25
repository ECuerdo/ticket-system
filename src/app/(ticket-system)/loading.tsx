import { Skeleton } from "@/components/ui/skeleton";

export default function TicketSystemLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 md:w-64 rounded-lg" />
          <Skeleton className="h-4 w-72 md:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Skeleton className="h-9 w-full sm:w-72 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Table / List rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-muted/20 gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 max-w-xs rounded-md" />
                  <Skeleton className="h-3 w-1/2 max-w-sm rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              <Skeleton className="h-8 w-16 rounded-lg shrink-0 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
