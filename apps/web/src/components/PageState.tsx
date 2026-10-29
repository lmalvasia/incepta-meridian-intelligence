import type { UseQueryResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type PageStateProps<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
};

export function PageState<T>({ query, children }: PageStateProps<T>) {
  if (query.isPending) {
    return <LoadingBlock />;
  }
  if (query.isError || query.data === undefined) {
    return <p className="text-sm text-destructive">This section could not be loaded.</p>;
  }
  return children(query.data);
}

function LoadingBlock() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading
      </p>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
