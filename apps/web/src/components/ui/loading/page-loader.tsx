import { m, useReducedMotion } from "motion/react";

import { springTransition } from "@/components/ui/motion";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Loading" }: PageLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <m.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="surface-card flex flex-col items-center gap-5 px-10 py-12"
      >
        <span className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <m.span
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 1.2, repeat: Infinity, ease: "linear" }
          }
          className="material-symbols-outlined text-3xl text-muted-foreground"
        >
          progress_activity
        </m.span>
        <SkeletonBlockLine />
      </m.div>
    </div>
  );
}

function SkeletonBlockLine() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-2 w-32 rounded-full bg-muted skeleton-shimmer" />
      <div className="h-2 w-20 rounded-full bg-muted/60 skeleton-shimmer" />
    </div>
  );
}
