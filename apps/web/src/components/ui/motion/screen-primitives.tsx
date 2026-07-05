import { AnimatePresence, m, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { FadeUp, Stagger, springTransition } from "./motion-primitives";

interface ScreenLayoutProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  gap?: string;
}

export function ScreenLayout({
  children,
  className,
  gap = "gap-6",
  ...props
}: ScreenLayoutProps) {
  return (
    <Stagger className={cn("flex flex-col w-full", gap, className)} {...props}>
      {children}
    </Stagger>
  );
}

interface ScreenHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function ScreenHeader({ title, description, actions, className }: ScreenHeaderProps) {
  return (
    <FadeUp className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", className)}>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </FadeUp>
  );
}

interface MotionPresenceBannerProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function MotionPresenceBanner({ show, children, className }: MotionPresenceBannerProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={springTransition}
          className={className}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

interface MotionDialogBodyProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function MotionDialogBody({ children, className, ...props }: MotionDialogBodyProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface HoverLiftProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function HoverLift({ children, className, ...props }: HoverLiftProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}
