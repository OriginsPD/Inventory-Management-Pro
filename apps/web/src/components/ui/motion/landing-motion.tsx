import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "motion/react";
import { useRef, type ReactNode } from "react";

import { springTransition } from "./motion-primitives";

export const landingEase = {
  duration: 0.7,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

interface RevealOnScrollProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

export function RevealOnScroll({
  children,
  className,
  delay = 0,
  ...props
}: RevealOnScrollProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
      whileInView={
        shouldReduceMotion
          ? undefined
          : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-10%" }}
      transition={{ ...springTransition, delay }}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface ParallaxLayerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  offset?: number;
  opacityRange?: [number, number];
}

export function ParallaxLayer({
  children,
  className,
  offset = 80,
  opacityRange,
  ...props
}: ParallaxLayerProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, offset]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    opacityRange ?? [1, 1, 1]
  );

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      style={opacityRange ? { y, opacity } : { y }}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface MagneticHoverProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function MagneticHover({ children, className, ...props }: MagneticHoverProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      whileHover={shouldReduceMotion ? undefined : { scale: 1.02, y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

interface ScrollProgressBarProps {
  progress: number;
  className?: string;
}

export function ScrollProgressBar({ progress, className }: ScrollProgressBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const scale = progress / 100;

  return (
    <div className={`h-1.5 bg-muted overflow-hidden ${className ?? ""}`}>
      <m.div
        className="h-full w-full origin-left bg-primary"
        initial={shouldReduceMotion ? false : { scaleX: 0 }}
        whileInView={shouldReduceMotion ? undefined : { scaleX: scale }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ ...landingEase, delay: 0.2 }}
        style={shouldReduceMotion ? { scaleX: scale } : undefined}
      />
    </div>
  );
}

export function useParallaxY(
  offset: number = 80
): { ref: React.RefObject<HTMLDivElement | null>; y: MotionValue<number> } {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, offset]);

  return { ref, y };
}
