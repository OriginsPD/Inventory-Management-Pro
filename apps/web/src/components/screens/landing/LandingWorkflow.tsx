import { RevealOnScroll } from "@/components/ui/motion";

import { workflowSteps } from "./constants";

export function LandingWorkflow() {
  return (
    <section id="workflow" className="px-4 py-24 md:py-32 sm:px-8 lg:px-12 border-t border-border/50">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="md:sticky md:top-32 md:self-start">
          <RevealOnScroll>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              Full Lifecycle
            </p>
            <h2 className="mt-3 text-2xl font-black text-foreground sm:text-3xl lg:text-4xl leading-tight">
              From intake to dispatch, every movement is traceable.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base max-w-md">
              Technicians scan, test, and dispatch hardware without losing context. Every action
              writes to the audit trail.
            </p>
          </RevealOnScroll>
        </div>

        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <RevealOnScroll key={step.title} delay={index * 0.08}>
              <div className="rounded-[2rem] p-1.5 ring-1 ring-border/40 bg-muted/30">
                <div className="flex gap-4 rounded-[calc(2rem-0.375rem)] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-xl">{step.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.08em] text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
