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

  console.log('[DEBUG] UserProfileModal Render - isOpen:', isOpen);
  
  // Security Form State
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
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
                Operator <span className="text-primary">Profile</span>
              </DialogTitle>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                Authorized Node ID: {user?.id.substring(0, 8)}...
              </p>
            </div>
            <div className="flex bg-zinc-900 p-1 border border-zinc-800">
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'activity' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Activity History
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'security' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Security & Account
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[400px] max-h-[70vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'activity' ? (
            <div className="p-6">
              {isLoadingLogs ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-zinc-900/50 animate-pulse border border-zinc-800/50" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history</span>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em]">No recent activity logs recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 p-3 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter ${
                            log.actionType === 'INGEST' ? 'bg-emerald-500/10 text-emerald-500' :
                            log.actionType === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                            log.actionType === 'LINK' ? 'bg-primary/10 text-primary' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {log.actionType}
                          </span>
                          {log.deviceIdentifier && (
                            <span className="text-[10px] font-mono text-zinc-300 font-bold">{log.deviceIdentifier}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{log.details}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd')}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-700">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 space-y-10">
              {/* Profile Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Operator Identity</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                
                <div className="grid gap-3">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] ml-0.5">Full Operator Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Operator Name"
                      className="bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100"
                    />
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isSaving || !name.trim() || name === user?.name}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-none px-6 h-10 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Credential Rotation</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] ml-0.5">Current Security Token</label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] ml-0.5">New Security Token</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] ml-0.5">Confirm New Token</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100"
                      />
                    </div>
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

        <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-[9px] font-black uppercase tracking-widest hover:bg-zinc-900 rounded-none px-6"
          >
            Terminate Session View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
