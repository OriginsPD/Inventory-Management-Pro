import { StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";

interface ChartSkeletonProps {
  height?: string;
  className?: string;
}

export function ChartSkeleton({ height = "h-[180px]", className }: ChartSkeletonProps) {
  return (
    <StaggerItem
      className={cn(
        "surface-card border border-dashed border-border p-5 space-y-4",
        className,
      )}
    >
      <div className="flex justify-between items-center">
        <SkeletonBlock variant="text" className="w-32 h-4" />
        <SkeletonBlock variant="badge" />
      </div>
      <div className={cn("w-full rounded-lg bg-primary/5 skeleton-shimmer", height)} />
    </StaggerItem>
  );
}
