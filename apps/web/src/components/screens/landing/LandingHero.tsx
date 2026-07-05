import { Link } from "@tanstack/react-router";

import {
  FadeUp,
  MagneticHover,
  Stagger,
  StaggerItem,
} from "@/components/ui/motion";

import { workflowStats } from "./constants";

export function LandingHero() {
  return (
    <div className="max-w-6xl space-y-8">
      <FadeUp delay={0}>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          <span className="material-symbols-outlined text-sm">verified_user</span>
          Secure inventory operations
        </div>
      </FadeUp>

      <FadeUp delay={0.06}>
        <div className="space-y-5">
          <h1 className="w-full max-w-6xl text-[clamp(2.75rem,5vw,5.5rem)] font-black leading-[1.05] tracking-tight text-foreground">
            Control hardware stock, dispatch, QC, and audit trails from one workspace.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            The platform helps operations teams manage physical devices through the full lifecycle:
            receiving inventory, linking components, dispatching assets to customers, testing hardware,
            handling RMA swaps, and exporting reports for accountability.
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.12}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <MagneticHover>
            <Link
              to="/login"
              className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-primary pl-6 pr-2 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In to Console
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <span className="material-symbols-outlined text-base">login</span>
              </span>
            </Link>
          </MagneticHover>
          <MagneticHover>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              View Features
            </a>
          </MagneticHover>
        </div>
      </FadeUp>

      <FadeUp delay={0.18}>
        <div className="rounded-[2rem] p-1.5 ring-1 ring-border/40 bg-muted/30 max-w-xl">
          <Stagger className="grid grid-cols-3 rounded-[calc(2rem-0.375rem)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            {workflowStats.map((stat) => (
              <StaggerItem
                key={stat.label}
                className="border-r border-border p-4 last:border-r-0 text-center sm:text-left"
              >
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.label}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </FadeUp>
    </div>
  );
}
