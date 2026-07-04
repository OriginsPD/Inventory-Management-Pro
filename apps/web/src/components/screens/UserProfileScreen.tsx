import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@ims_pro/ui/components/button';
import { Input } from '@ims_pro/ui/components/input';
import { useAuth, type User } from '@/components/ui/auth-context';
import { useFeedback } from '@/components/ui/feedback-provider';
import { apiClient } from '@/lib/api-client';

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

  const [showPasswords, setShowPasswords] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGEST' | 'LINK' | 'DELETE'>('ALL');

  const getPasswordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const pwStrength = getPasswordStrength(newPassword);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = filterText === '' || 
      log.details.toLowerCase().includes(filterText.toLowerCase()) || 
      (log.deviceIdentifier && log.deviceIdentifier.toLowerCase().includes(filterText.toLowerCase()));
    const matchesType = filterType === 'ALL' || log.actionType === filterType;
    return matchesSearch && matchesType;
  });

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
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Verify terminal node authorization logs and credential signatures
        </p>
      </div>

      {/* Premium Access Badge Pass Mockup */}
      <div className="glass-panel border-l-4 border-l-primary p-6 mb-8 rounded-xl shadow-lg shadow-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background circuit aesthetics using css stripes/grid */}
        <div className="absolute right-0 top-0 bottom-0 w-44 bg-grid-white/[0.02] mask-gradient pointer-events-none select-none opacity-20" />
        
        <div className="flex items-center gap-5 relative z-10">
          {/* Circular Dynamic Gradients Avatar */}
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

        {/* Physical Barcode Badge Representation */}
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
            CLEARANCE SECURED · {user?.id.substring(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="p-4 border-b border-border/60 bg-muted/30 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            Station Settings Panel
          </p>
          <div className="flex bg-muted/60 p-1 border border-border rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-md ${
                activeTab === 'activity' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity History
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-md ${
                activeTab === 'security' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Security & Credentials
            </button>
          </div>
        </div>

        {activeTab === 'activity' ? (
          <div className="p-6 min-h-[420px] space-y-6">
            {/* Filter and Search Utility Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search audit trail by serial, details..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="flex h-10 flex-1 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/35 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <div className="flex bg-muted/40 p-0.5 border border-border/80 rounded-lg">
                {(['ALL', 'INGEST', 'LINK', 'DELETE'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      filterType === type 
                        ? 'bg-card text-foreground border border-border/80 shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-muted/60 animate-pulse border border-border rounded-xl" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]">No operations logs fit current filter parameters</p>
              </div>
            ) : (
              /* Connected Timeline Layout */
              <div className="relative pl-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-4">
                {filteredLogs.map((log) => {
                  let badgeStyles = 'border-muted text-muted bg-muted/50';
                  let timelineNodeStyle = 'border-border/80 bg-background text-muted-foreground';
                  let icon = 'info';

                  if (log.actionType === 'INGEST') {
                    badgeStyles = 'border-emerald-500/25 bg-emerald-500/5 text-emerald-500';
                    timelineNodeStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-sm shadow-emerald-500/10';
                    icon = 'download';
                  } else if (log.actionType === 'DELETE') {
                    badgeStyles = 'border-red-500/25 bg-red-500/5 text-red-500';
                    timelineNodeStyle = 'border-red-500/50 bg-red-500/10 text-red-500 shadow-sm shadow-red-500/10';
                    icon = 'delete';
                  } else if (log.actionType === 'LINK') {
                    badgeStyles = 'border-primary/25 bg-primary/5 text-primary';
                    timelineNodeStyle = 'border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10';
                    icon = 'hub';
                  }

                  return (
                    <div key={log.id} className="relative flex gap-4 group">
                      {/* Timeline Glowing Node */}
                      <div className={`absolute -left-[27px] top-1.5 h-9 w-9 rounded-full border flex items-center justify-center relative z-10 shrink-0 transition-transform group-hover:scale-105 ${timelineNodeStyle}`}>
                        <span className="material-symbols-outlined text-[16px] font-black">{icon}</span>
                      </div>
                      
                      {/* Log Entry Card */}
                      <div className="flex-1 glass-panel hover:bg-card/80 p-4 rounded-xl transition-all flex flex-col sm:flex-row items-start justify-between gap-4 border border-border/80 hover:border-primary/20">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider border ${badgeStyles}`}>
                              {log.actionType}
                            </span>
                            {log.deviceIdentifier && (
                              <span className="text-[10px] font-mono text-foreground font-black bg-muted/60 px-1.5 py-0.5 border border-border/60 rounded">
                                {log.deviceIdentifier}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{log.details}</p>
                        </div>
                        <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-border/30 pt-2 sm:pt-0 w-full sm:w-auto font-mono text-[9px] text-muted-foreground uppercase">
                          <p className="font-bold text-foreground">{format(new Date(log.createdAt), 'yyyy-MM-dd')}</p>
                          <p className="text-[8px] mt-0.5">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-10 min-h-[420px]">
            {/* Identity Form Panel */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-[0.25em]">Operator Credentials</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid gap-3">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] ml-0.5">Full Operator Handle</label>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Operator Name"
                    className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                  />
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isSaving || !name.trim() || name === user?.name}
                    className="bg-primary hover:bg-primary/95 text-white rounded-lg px-6 h-10 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Commit Profile Name
                  </Button>
                </div>
              </div>
            </div>

            {/* Credential Rotation Form */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-[0.25em]">Credential Verification Key</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current security token"
                    className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPasswords ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New security token"
                      className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                    />
                    
                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[8px] font-mono text-muted-foreground uppercase">
                          <span>Token Entropy:</span>
                          <span className={
                            pwStrength <= 1 ? 'text-red-400 font-bold' :
                            pwStrength <= 3 ? 'text-amber-500 font-bold' :
                            'text-emerald-500 font-bold'
                          }>
                            {pwStrength <= 1 ? 'Vulnerable' : pwStrength <= 3 ? 'Medium Strength' : 'High Entropy'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div 
                              key={i} 
                              className={`h-1.5 rounded transition-all duration-300 ${
                                i <= pwStrength 
                                  ? pwStrength <= 1 ? 'bg-red-400' 
                                    : pwStrength <= 3 ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                                  : 'bg-muted border border-border/40'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new token"
                    className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving || !newPassword || newPassword !== confirmPassword}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-black rounded-lg h-11 text-[9px] uppercase tracking-[0.25em] transition-all active:scale-[0.99] mt-2 shadow-sm shadow-primary/5"
                >
                  Commit Security Tokens
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
