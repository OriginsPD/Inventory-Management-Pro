import { ScreenLayout, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { CardGridSkeleton } from "./card-grid-skeleton";
import { ChartSkeleton } from "./chart-skeleton";
import { FormSkeleton } from "./form-skeleton";
import { ListSkeleton } from "./list-skeleton";
import { SkeletonBlock } from "./skeleton-block";
import { TabPanelSkeleton } from "./tab-panel-skeleton";
import { TableSkeleton } from "./table-skeleton";

export type ScreenLoadingVariant =
  | "dashboard"
  | "table"
  | "tabs"
  | "form"
  | "profile"
  | "default";

interface ScreenLoadingShellProps {
  variant?: ScreenLoadingVariant;
  className?: string;
}

function HeaderSkeleton() {
  return (
    <StaggerItem className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <SkeletonBlock variant="title" className="h-9 w-56" />
        <SkeletonBlock variant="text" className="h-3 w-72 max-w-full" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <SkeletonBlock variant="badge" className="h-9 w-24" />
        <SkeletonBlock variant="badge" className="h-9 w-32" />
      </div>
    </StaggerItem>
  );
}

function BodySkeleton({ variant }: { variant: ScreenLoadingVariant }) {
  switch (variant) {
    case "dashboard":
      return (
        <>
          <CardGridSkeleton count={5} columns={5} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TableSkeleton rows={4} />
        </>
      );
    case "table":
      return <TableSkeleton rows={6} />;
    case "tabs":
      return <TabPanelSkeleton />;
    case "form":
      return <FormSkeleton />;
    case "profile":
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StaggerItem className="glass-panel rounded-xl p-6 space-y-4 lg:col-span-1">
            <SkeletonBlock variant="avatar" className="h-20 w-20 mx-auto" />
            <SkeletonBlock variant="title" className="mx-auto h-6 w-40" />
            <SkeletonBlock variant="text" className="mx-auto h-3 w-32" />
          </StaggerItem>
          <div className="lg:col-span-2">
            <ListSkeleton rows={6} />
          </div>
        </div>
      );
    default:
      return (
        <>
          <CardGridSkeleton count={3} columns={3} />
          <TableSkeleton rows={5} />
        </>
      );
  }
}

export function ScreenLoadingShell({
  variant = "default",
  className,
}: ScreenLoadingShellProps) {
  return (
    <ScreenLayout className={cn("w-full", className)}>
      <HeaderSkeleton />
      <BodySkeleton variant={variant} />
    </ScreenLayout>
  );
}
