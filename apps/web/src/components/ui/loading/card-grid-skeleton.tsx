import { StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";

interface CardGridSkeletonProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

const columnClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 md:grid-cols-5",
};

export function CardGridSkeleton({
  count = 4,
  columns = 4,
  className,
}: CardGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StaggerItem
          key={i}
          className="surface-card rounded-xl p-5 space-y-3 ring-1 border-border"
        >
          <div className="flex justify-between items-start">
            <SkeletonBlock variant="text" className="w-2/3 h-3" />
            <SkeletonBlock variant="icon" />
          </div>
          <SkeletonBlock variant="title" className="h-7 w-1/2" />
          <SkeletonBlock variant="text" className="w-1/3 h-2.5" />
        </StaggerItem>
      ))}
    </div>
  );
}
