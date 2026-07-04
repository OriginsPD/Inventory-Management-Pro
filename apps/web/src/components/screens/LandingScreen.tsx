import { Link } from '@tanstack/react-router';
import heroImage from "@/assets/hero.png";
import { FaviconBg } from '@/components/ui/FaviconBg';
import { IMSBrandLogo } from '@/components/ui/IMSBrandLogo';

const featureCards = [
  {
    icon: 'inventory_2',
    title: 'Live Device Inventory',
    description: 'Track serials, asset classes, stock status, linked components, and assignment history from one operational view.',
  },
  {
    icon: 'local_shipping',
    title: 'Customer Dispatch',
    description: 'Stage devices for customers, manage returns, and keep dispatch activity tied to customer records.',
  },
  {
    icon: 'biotech',
    title: 'QC Bench',
    description: 'Run technician checks, capture pass or fail outcomes, and maintain hardware lifecycle visibility.',
  },
  {
    icon: 'analytics',
    title: 'Reports and Audit Trails',
    description: 'Export inventory, stock health, customer allocation, and technician activity reports for review.',
  },
];

const workflowStats = [
  { value: '3', label: 'Operator roles' },
  { value: '9', label: 'Asset classes' },
  { value: '4', label: 'Core workflows' },
];

export const LandingScreen = () => {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      <section className="relative min-h-screen px-5 py-6 sm:px-8 lg:px-12 flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(var(--color-primary-rgb),0.16),transparent_32%),linear-gradient(135deg,rgba(var(--color-card-rgb),0.96),rgba(var(--color-background-rgb),1)_55%)]" />
        <FaviconBg className="-top-48 -right-48 w-[800px] h-[800px] sm:-top-80 sm:-right-80 sm:w-[1200px] sm:h-[1200px] opacity-[0.08] dark:opacity-[0.02] rotate-[-15deg] text-foreground" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IMSBrandLogo size={48} showText={true} />
          </div>
          <Link
            to="/login"
            className="hidden sm:inline-flex h-10 items-center justify-center border border-border px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-primary/60 hover:text-primary transition-colors"
          >
            Sign In
          </Link>
        </header>

        <div className="relative z-10 grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Secure inventory operations
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Control hardware stock, dispatch, QC, and audit trails from one workspace.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                The platform helps operations teams manage physical devices through the full lifecycle: receiving inventory,
                linking components, dispatching assets to customers, testing hardware, handling RMA swaps, and exporting
                reports for accountability.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                Sign In to Console
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 border border-border px-6 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                View Features
              </a>
            </div>

            <div className="grid max-w-xl grid-cols-3 border border-border bg-card/70">
              {workflowStats.map((stat) => (
                <div key={stat.label} className="border-r border-border p-4 last:border-r-0">
                  <p className="text-2xl font-black text-foreground">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[520px]">
            <div className="absolute inset-0 rounded-[2rem] border border-border bg-card/60 shadow-2xl" />
            <div className="absolute inset-6 overflow-hidden border border-primary/20 bg-card">
              <img
                src={heroImage}
                alt="Layered inventory system module"
                className="absolute right-4 top-4 h-48 w-48 object-contain opacity-90 sm:h-64 sm:w-64"
              />
              <div className="absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-card via-card/95 to-transparent p-6 pt-28">
                <div className="grid grid-cols-2 gap-3">
                  {['IN_STOCK', 'DISPATCHED', 'TESTING', 'RMA'].map((status, idx) => (
                    <div key={status} className="border border-border bg-background/80 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground">{status}</span>
                        <span className={`h-2 w-2 rounded-full ${idx === 0 ? 'bg-emerald-400' : idx === 1 ? 'bg-sky-400' : idx === 2 ? 'bg-amber-400' : 'bg-red-400'}`} />
                      </div>
                      <div className="mt-3 h-1.5 bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${72 - idx * 13}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border border-primary/25 bg-primary/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Operational focus</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Keep device movement, technician checks, customer allocation, and audit history connected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">What It Helps With</p>
            <h2 className="mt-3 text-2xl font-black text-foreground sm:text-3xl">A focused workspace for inventory teams.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <article key={feature.title} className="border border-border bg-card p-5">
                <span className="material-symbols-outlined text-2xl text-primary">{feature.icon}</span>
                <h3 className="mt-5 text-sm font-black uppercase tracking-[0.08em] text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
