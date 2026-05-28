import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../ui/auth-context';
import { useFeedback } from '../ui/feedback-provider';
import { apiClient } from '../../lib/api-client';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceIdentifier?: string;
}

export const UserProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user, setUser } = useAuth();
  const { toast } = useFeedback();
  const [activeTab, setActiveTab] = useState<'activity' | 'security'>('activity');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGEST' | 'LINK' | 'DELETE'>('ALL');
  
  // Security Form State
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    if (!isOpen || activeTab !== 'activity') return;
    const timer = window.setTimeout(() => {
      fetchAuditLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeTab, fetchAuditLogs]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean; user: typeof user }>('/api/users/me/profile', { name });
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-foreground uppercase italic">
                  Operator <span className="text-primary">Profile</span>
                </DialogTitle>
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                  Authorized Node ID: {user?.id.substring(0, 8)}...
                </p>
              </div>
              <div className="flex bg-muted/65 p-1 border border-border rounded-lg">
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all rounded-md ${
                    activeTab === 'activity' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all rounded-md ${
                    activeTab === 'security' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Credentials
                </button>
              </div>
            </div>

            <div className="border border-border/80 p-4 rounded-xl bg-card/60 flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-xs font-black text-white shadow">
                  {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'OP'}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{user?.name}</p>
                  <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
                    {user?.role === 'SUPER_USER' ? 'Admin Node' : 'Technician Node'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-[1px] items-stretch h-6 opacity-35 select-none" aria-hidden="true">
                {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3].map((w, idx) => (
                  <div 
                    key={idx} 
                    className="bg-foreground" 
                    style={{ width: `${(w % 2) + 1}px` }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[360px] max-h-[60vh] overflow-y-auto scrollbar-custom p-6 space-y-6 bg-card">
          {activeTab === 'activity' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="flex h-9 flex-1 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/35 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="flex bg-muted/40 p-0.5 border border-border/80 rounded-md">
                  {(['ALL', 'INGEST', 'LINK', 'DELETE'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded transition-all ${
                        filterType === type 
                          ? 'bg-card text-foreground border border-border/85 shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted/60 animate-pulse border border-border rounded-xl" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <span className="material-symbols-outlined text-3xl mb-1.5 opacity-30">history</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em]">No logs fit search criteria</p>
                </div>
              ) : (
                <div className="relative pl-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-3">
                  {filteredLogs.map((log) => {
                    let badgeStyles = 'border-muted text-muted bg-muted/50';
                    let timelineNodeStyle = 'border-border/80 bg-background text-muted-foreground';
                    let icon = 'info';

                    if (log.actionType === 'INGEST') {
                      badgeStyles = 'border-emerald-500/25 bg-emerald-500/5 text-emerald-500';
                      timelineNodeStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500';
                      icon = 'download';
                    } else if (log.actionType === 'DELETE') {
                      badgeStyles = 'border-red-500/25 bg-red-500/5 text-red-500';
                      timelineNodeStyle = 'border-red-500/50 bg-red-500/10 text-red-500';
                      icon = 'delete';
                    } else if (log.actionType === 'LINK') {
                      badgeStyles = 'border-primary/25 bg-primary/5 text-primary';
                      timelineNodeStyle = 'border-primary/50 bg-primary/10 text-primary';
                      icon = 'hub';
                    }

                    return (
                      <div key={log.id} className="relative flex gap-3 group">
                        <div className={`absolute -left-[27px] top-1 h-9 w-9 rounded-full border flex items-center justify-center relative z-10 shrink-0 ${timelineNodeStyle}`}>
                          <span className="material-symbols-outlined text-[14px] font-black">{icon}</span>
                        </div>
                        
                        <div className="flex-1 glass-panel hover:bg-card/80 p-3.5 rounded-xl transition-all flex flex-col sm:flex-row items-start justify-between gap-3 border border-border/80 hover:border-primary/20">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider border ${badgeStyles}`}>
                                {log.actionType}
                              </span>
                              {log.deviceIdentifier && (
                                <span className="text-[9px] font-mono text-foreground font-black bg-muted/65 px-1.5 py-0.5 rounded">
                                  {log.deviceIdentifier}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">{log.details}</p>
                          </div>
                          <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-border/30 pt-1.5 sm:pt-0 font-mono text-[8px] text-muted-foreground uppercase">
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
            <div className="space-y-8 p-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Operator Settings</span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Operator Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Operator Name"
                      className="bg-background border-border text-xs h-9 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                    />
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isSaving || !name.trim() || name === user?.name}
                      className="bg-primary hover:bg-primary/95 text-white rounded-lg px-5 h-9 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Security Update</span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current security token"
                      className="bg-background border-border text-xs h-9 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showPasswords ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New security token"
                        className="bg-background border-border text-xs h-9 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                      />
                      
                      {newPassword && (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex justify-between items-center text-[7px] font-mono text-muted-foreground uppercase">
                            <span>Entropy Index:</span>
                            <span className={
                              pwStrength <= 1 ? 'text-red-400 font-bold' :
                              pwStrength <= 3 ? 'text-amber-500 font-bold' :
                              'text-emerald-500 font-bold'
                            }>
                              {pwStrength <= 1 ? 'Weak' : pwStrength <= 3 ? 'Medium' : 'Secure'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-0.5">
                            {[1, 2, 3, 4].map((i) => (
                              <div 
                                key={i} 
                                className={`h-1 rounded transition-all duration-350 ${
                                  i <= pwStrength 
                                    ? pwStrength <= 1 ? 'bg-red-400' 
                                      : pwStrength <= 3 ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                    : 'bg-muted border border-border/30'
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
                      className="bg-background border-border text-xs h-9 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isSaving || !newPassword || newPassword !== confirmPassword}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-black rounded-lg h-10 text-[9px] uppercase tracking-[0.2em] transition-all active:scale-[0.99] mt-1 shadow-sm"
                  >
                    Commit Tokens
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/20 border-t border-border flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-[8px] font-black uppercase tracking-widest hover:bg-muted/70 rounded-lg px-5 h-8"
          >
            Close Profile View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
