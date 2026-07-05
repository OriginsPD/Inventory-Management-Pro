import { FaviconBg } from "@/components/ui/FaviconBg";
import { ParallaxLayer } from "@/components/ui/motion";

import {
  LandingBento,
  LandingFooter,
  LandingHero,
  LandingNav,
  LandingShowcase,
  LandingWorkflow,
} from "./landing";

export const LandingScreen = () => {
  return (
    <main className="landing-grain min-h-screen bg-background text-foreground overflow-x-hidden">
      <section className="relative min-h-[100dvh] flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(var(--color-primary-rgb),0.16),transparent_32%),linear-gradient(135deg,rgba(var(--color-card-rgb),0.96),rgba(var(--color-background-rgb),1)_55%)]" />

        <ParallaxLayer offset={60} className="absolute -top-48 -right-48 sm:-top-80 sm:-right-80 pointer-events-none">
          <FaviconBg className="w-[800px] h-[800px] sm:w-[1200px] sm:h-[1200px] opacity-[0.08] dark:opacity-[0.02] rotate-[-15deg] text-foreground relative" />
        </ParallaxLayer>

        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <LandingNav />

        <div className="relative z-10 grid flex-1 items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-20">
          <LandingHero />
          <LandingShowcase />
        </div>
      </section>

      <LandingBento />
      <LandingWorkflow />
      <LandingFooter />
    </main>
  );
};
