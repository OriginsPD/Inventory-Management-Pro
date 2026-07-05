import { Skeleton } from "@ims_pro/ui/components/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonBlockVariant = "text" | "title" | "badge" | "icon" | "avatar" | "block";

const variantClasses: Record<SkeletonBlockVariant, string> = {
  text: "h-4 w-full max-w-[12rem]",
  title: "h-8 w-full max-w-[16rem]",
  badge: "h-6 w-20 rounded-full",
  icon: "h-5 w-5 rounded-md",
  avatar: "h-10 w-10 rounded-full",
  block: "h-full w-full min-h-[1rem]",
};

interface SkeletonBlockProps {
  variant?: SkeletonBlockVariant;
  className?: string;
}

export function SkeletonBlock({ variant = "block", className }: SkeletonBlockProps) {
  return (
    <Skeleton
      className={cn(
        "rounded-md bg-primary/8 border-0 skeleton-shimmer",
        variantClasses[variant],
        className,
      )}
    />
  );
}
