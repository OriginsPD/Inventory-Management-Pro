import {
  MagneticHover,
  RevealOnScroll,
  Stagger,
  StaggerItem,
} from "@/components/ui/motion";

import { featureCards } from "./constants";

export function LandingBento() {
  return (
    <section id="features" className="px-4 pb-24 sm:px-8 lg:px-12 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <RevealOnScroll className="mb-12 max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            What It Helps With
          </p>
          <h2 className="mt-3 text-2xl font-black text-foreground sm:text-3xl lg:text-4xl">
            A focused workspace for inventory teams.
          </h2>
        </RevealOnScroll>

        <Stagger className="grid grid-cols-1 md:grid-cols-12 grid-flow-dense gap-4">
          {featureCards.map((feature, index) => (
            <StaggerItem
              key={feature.title}
              className={`col-span-12 ${feature.span}`}
            >
              <MagneticHover className="h-full">
                <RevealOnScroll delay={index * 0.05} className="h-full">
                  <div className="h-full rounded-[2rem] p-1.5 ring-1 ring-border/40 bg-muted/30">
                    <article className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-card p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                      <span className="material-symbols-outlined text-2xl text-primary">{feature.icon}</span>
                      <h3 className="mt-5 text-sm font-black uppercase tracking-[0.08em] text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                        {feature.description}
                      </p>
                    </article>
                  </div>
                </RevealOnScroll>
              </MagneticHover>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
