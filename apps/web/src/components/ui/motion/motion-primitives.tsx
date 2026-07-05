import { m, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

export const springTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

interface FadeUpProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

export function FadeUp({ children, className, delay = 0, ...props }: FadeUpProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...springTransition, delay }}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface StaggerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  stagger?: number;
}

export function Stagger({ children, className, stagger = 0.06, ...props }: StaggerProps) {
  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      variants={
        shouldReduceMotion
          ? {}
          : {
              hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: springTransition,
              },
            }
      }
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}
