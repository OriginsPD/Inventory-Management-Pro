import { StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";

interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export function FormSkeleton({ fields = 3, className }: FormSkeletonProps) {
  return (
    <div className={cn("mx-auto w-full max-w-md space-y-6 p-6", className)}>
      <StaggerItem className="space-y-2 text-center">
        <SkeletonBlock variant="title" className="mx-auto h-8 w-48" />
        <SkeletonBlock variant="text" className="mx-auto h-3 w-32" />
      </StaggerItem>
      {Array.from({ length: fields }).map((_, i) => (
        <StaggerItem key={i} className="space-y-2">
          <SkeletonBlock variant="text" className="h-3 w-20" />
          <SkeletonBlock variant="block" className="h-10 w-full rounded-lg" />
        </StaggerItem>
      ))}
      <StaggerItem>
        <SkeletonBlock variant="block" className="h-11 w-full rounded-full" />
      </StaggerItem>
    </div>
  );
}
