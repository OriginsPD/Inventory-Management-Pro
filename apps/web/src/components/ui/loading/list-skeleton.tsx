import { StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";

interface ListSkeletonProps {
  rows?: number;
  className?: string;
}

export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <StaggerItem
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4"
        >
          <SkeletonBlock variant="avatar" className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock variant="text" className="w-2/3 h-3.5" />
            <SkeletonBlock variant="text" className="w-1/2 h-3" />
          </div>
          <SkeletonBlock variant="badge" className="shrink-0" />
        </StaggerItem>
      ))}
    </div>
  );
}
