import { m, useReducedMotion } from "motion/react";

import { springTransition } from "@/components/ui/motion";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "SYNCING TERMINAL" }: PageLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <m.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="rounded-[2rem] p-1.5 ring-1 ring-primary/10 bg-black/5 dark:bg-white/5"
      >
        <div className="glass-panel flex flex-col items-center gap-5 rounded-[calc(2rem-0.375rem)] px-10 py-12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </span>
          <m.span
            animate={shouldReduceMotion ? undefined : { rotate: 360 }}
            transition={
              shouldReduceMotion
                ? undefined
                : { duration: 1.2, repeat: Infinity, ease: "linear" }
            }
            className="material-symbols-outlined text-3xl text-primary"
          >
            progress_activity
          </m.span>
          <SkeletonBlockLine />
        </div>
      </m.div>
    </div>
  );
}

function SkeletonBlockLine() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-2 w-32 rounded-full bg-primary/10 skeleton-shimmer" />
      <div className="h-2 w-20 rounded-full bg-primary/5 skeleton-shimmer" />
    </div>
  );
}
