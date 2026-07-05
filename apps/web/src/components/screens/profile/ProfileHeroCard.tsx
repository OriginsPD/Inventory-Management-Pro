import { useAuth } from '@/components/ui/auth-context';

export function ProfileHeroCard() {
  const { user } = useAuth();

  return (
    <div className="rounded-[1.25rem] p-1 ring-1 ring-primary/10 mb-6">
      <div className="glass-panel rounded-[calc(1.25rem-0.25rem)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-44 bg-grid-white/[0.02] mask-gradient pointer-events-none select-none opacity-20" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-full border border-border bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-xl font-black text-white shadow-md">
            {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'OP'}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight">{user?.name}</h2>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider border ${
                user?.role === 'SUPER_USER'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}>
                {user?.role === 'SUPER_USER' ? 'Admin Node' : 'Technician Node'}
              </span>
            </div>

            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              System ID: <span className="text-foreground">{user?.id}</span>
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              Station Link: <span className="text-foreground lowercase">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 relative z-10 border-t sm:border-t-0 border-border/40 pt-4 sm:pt-0 w-full sm:w-auto">
          <div className="flex gap-[2px] items-stretch h-8 opacity-45 select-none" aria-hidden="true">
            {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6].map((w, idx) => (
              <div
                key={idx}
                className="bg-foreground"
                style={{ width: `${(w % 3) + 1}px` }}
              />
            ))}
          </div>
          <span className="text-[8px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
            CLEARANCE SECURED · {(user?.id ?? '').substring(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
