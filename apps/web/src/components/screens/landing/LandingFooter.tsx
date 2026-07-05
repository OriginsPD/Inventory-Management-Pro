import { Link } from "@tanstack/react-router";

import { MagneticHover, RevealOnScroll } from "@/components/ui/motion";

export function LandingFooter() {
  return (
    <footer className="px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <RevealOnScroll>
          <div className="rounded-[2rem] p-1.5 ring-1 ring-border/40 bg-muted/30">
            <div className="rounded-[calc(2rem-0.375rem)] bg-card px-8 py-12 sm:px-12 sm:py-16 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <h2 className="text-2xl font-black text-foreground sm:text-3xl lg:text-4xl max-w-2xl mx-auto leading-tight">
                Ready to run your warehouse from one console?
              </h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
                Sign in to manage inventory, dispatch, QC, and reports with full audit visibility.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <MagneticHover>
                  <Link
                    to="/login"
                    className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-primary pl-6 pr-2 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Authorize Session
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px">
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </span>
                  </Link>
                </MagneticHover>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#workflow" className="hover:text-foreground transition-colors">
                  Workflow
                </a>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </footer>
  );
}
