import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth, type User } from '../ui/auth-context';
import { useFeedback } from '../ui/feedback-provider';
import { apiClient } from '../../lib/api-client';

interface AuditEntry {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceIdentifier?: string;
}

export const UserProfileScreen = () => {
  const { user, setUser } = useAuth();
  const { toast } = useFeedback();
  const [activeTab, setActiveTab] = useState<'activity' | 'security'>('activity');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await apiClient.get<AuditEntry[]>('/api/users/me/audit', {
        suppressAuthRedirect: true,
      });
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to fetch personal audit logs', e);
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'activity') return;
    const timer = window.setTimeout(() => {
      fetchAuditLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, fetchAuditLogs]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean; user: User }>('/api/users/me/profile', { name });
      if (res.success) {
        setUser(res.user);
        toast.success('Operator profile updated');
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/api/users/me/password', { currentPassword, newPassword });
      toast.success('Security token updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
          Operator <span className="text-primary">Profile</span>
        </h1>
        <p className="text-[10px] font-mono text-muted uppercase tracking-widest">
          Authorized Node ID: {user?.id.substring(0, 8)}... · {user?.email} · {user?.role.replace('_', ' ')}
        </p>
      </div>

      <div className="bg-card border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-foreground uppercase tracking-tight">{user?.name}</p>
            <p className="text-[10px] font-mono text-muted uppercase tracking-widest mt-1">
              {user?.role === 'SUPER_USER' ? 'Admin Node' : user?.role === 'TECHNICIAN' ? 'Technician Node' : 'Review Node'}
            </p>
          </div>
          <div className="flex bg-muted/60 p-1 border border-border w-fit">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'activity' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              Activity History
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'security' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              Security & Account
            </button>
          </div>
        </div>

        {activeTab === 'activity' ? (
          <div className="p-6 min-h-[420px]">
            {isLoadingLogs ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted/60 animate-pulse border border-border" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history</span>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]">No recent activity logs recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="group bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/30 p-3 transition-all flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter ${
                          log.actionType === 'INGEST' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.actionType === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                          log.actionType === 'LINK' ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted'
                        }`}>
                          {log.actionType}
                        </span>
                        {log.deviceIdentifier && (
                          <span className="text-[10px] font-mono text-foreground font-bold">{log.deviceIdentifier}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-snug">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-mono text-muted uppercase tracking-tighter">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd')}
                      </p>
                      <p className="text-[9px] font-mono text-muted/70">
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 space-y-10 min-h-[420px]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Operator Identity</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-3">
                <label className="text-[9px] font-bold text-muted uppercase tracking-[0.15em] ml-0.5">Full Operator Name</label>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Operator Name"
                    className="bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground"
                  />
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isSaving || !name.trim() || name === user?.name}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-none px-6 h-10 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Update
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Credential Rotation</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current security token"
                  className="bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New security token"
                    className="bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new token"
                    className="bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving || !newPassword || newPassword !== confirmPassword}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black rounded-none h-11 text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] mt-2"
                >
                  Commit Security Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
