import { useAuth } from '@/components/ui/auth-context';
import { PortalBadge } from '@/components/ui/portal';

export function ProfileHeroCard() {
  const { user } = useAuth();

  return (
    <div className="surface-card p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center text-lg font-medium text-foreground">
          {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'OP'}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-serif text-xl tracking-tight text-foreground">{user?.name}</h2>
            <PortalBadge variant={user?.role === 'SUPER_USER' ? 'warning' : 'success'}>
              {user?.role === 'SUPER_USER' ? 'Admin' : 'Technician'}
            </PortalBadge>
          </div>

          <p className="text-xs font-mono text-muted-foreground">
            ID: <span className="text-foreground">{user?.id}</span>
          </p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}
