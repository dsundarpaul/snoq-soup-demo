import { Skeleton } from "@/components/ui/skeleton";

export function RouteSegmentLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
