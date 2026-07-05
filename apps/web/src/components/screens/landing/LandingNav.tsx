import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

import { IMSBrandLogo } from "@/components/ui/IMSBrandLogo";
import { FadeUp, springTransition } from "@/components/ui/motion";

import { navLinks } from "./constants";

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <FadeUp className="relative z-30 px-4 sm:px-8 lg:px-12 pt-6">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full glass-panel-elevated px-4 py-2.5 sm:px-6">
          <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <IMSBrandLogo size={36} showText={true} />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground"
            >
              <span className="sr-only">{menuOpen ? "Close" : "Menu"}</span>
              <span
                className={`absolute block h-0.5 w-4 bg-current transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? "rotate-45" : "-translate-y-1"
                }`}
              />
              <span
                className={`absolute block h-0.5 w-4 bg-current transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? "-rotate-45" : "translate-y-1"
                }`}
              />
            </button>
          </div>
        </nav>
      </FadeUp>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={springTransition}
            className="fixed inset-0 z-40 md:hidden backdrop-blur-3xl bg-background/85"
          >
            <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-8">
              {navLinks.map((link, i) => (
                <m.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
                  transition={{ ...springTransition, delay: i * 0.08 }}
                  className="text-2xl font-black uppercase tracking-tight text-foreground"
                >
                  {link.label}
                </m.a>
              ))}
              <m.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: navLinks.length * 0.08 }}
              >
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground"
                >
                  Sign In
                </Link>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
