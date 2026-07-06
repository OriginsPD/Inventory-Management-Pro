import { StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";
import { TableSkeleton } from "./table-skeleton";

interface TabPanelSkeletonProps {
  tabCount?: number;
  className?: string;
}

export function TabPanelSkeleton({ tabCount = 4, className }: TabPanelSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <StaggerItem className="flex border-b border-border gap-1">
        {Array.from({ length: tabCount }).map((_, i) => (
          <SkeletonBlock key={i} variant="badge" className="h-9 w-28 rounded-none rounded-t-md mb-[-1px]" />
        ))}
      </StaggerItem>
      <StaggerItem className="surface-card rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <SkeletonBlock variant="title" className="h-6 w-48" />
          <SkeletonBlock variant="badge" className="h-9 w-32" />
        </div>
        <TableSkeleton rows={4} wrapped={false} />
      </StaggerItem>
    </div>
  );
}
