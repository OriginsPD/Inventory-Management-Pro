import heroImage from "@/assets/hero.png";
import { ParallaxLayer, RevealOnScroll, ScrollProgressBar } from "@/components/ui/motion";

import { statusCards } from "./constants";

export function LandingShowcase() {
  return (
    <RevealOnScroll className="relative min-h-[360px] lg:min-h-[520px]">
      <div className="rounded-[2rem] p-1.5 ring-1 ring-border/40 bg-muted/30 h-full">
        <div className="relative h-full min-h-[340px] overflow-hidden rounded-[calc(2rem-0.375rem)] border border-primary/20 bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] lg:min-h-[500px]">
          <ParallaxLayer offset={40} opacityRange={[0.85, 1, 0.85]} className="absolute right-4 top-4 sm:right-8 sm:top-8">
            <img
              src={heroImage}
              alt="Layered inventory system module"
              className="h-48 w-48 object-contain opacity-90 sm:h-64 sm:w-64"
            />
          </ParallaxLayer>

          <div className="absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-card via-card/95 to-transparent p-6 pt-28">
            <div className="grid grid-cols-2 gap-3">
              {statusCards.map((item) => (
                <RevealOnScroll key={item.status} delay={0.05}>
                  <div className="border border-border bg-background/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">{item.status}</span>
                      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    </div>
                    <div className="mt-3">
                      <ScrollProgressBar progress={item.progress} />
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>

            <RevealOnScroll delay={0.15}>
              <div className="border border-primary/25 bg-primary/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Operational focus</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep device movement, technician checks, customer allocation, and audit history connected.
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
