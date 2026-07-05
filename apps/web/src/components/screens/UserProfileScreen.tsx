import { useCallback, useEffect, useState } from 'react';
import { useAuth, type User } from '@/components/ui/auth-context';
import { useFeedback } from '@/components/ui/feedback-provider';
import { apiClient } from '@/lib/api-client';
import { PortalSectionShell } from '@/components/layout/PortalSectionShell';
import { ProfileHeroCard } from '@/components/screens/profile/ProfileHeroCard';
import { ProfileActivityPanel } from '@/components/screens/profile/ProfileActivityPanel';
import { ProfileSecurityPanel } from '@/components/screens/profile/ProfileSecurityPanel';

interface AuditEntry {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceIdentifier?: string;
}

const PROFILE_TABS = [
  { id: 'activity', label: 'Activity History', icon: 'history' },
  { id: 'security', label: 'Security & Credentials', icon: 'lock' },
] as const;

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
    <PortalSectionShell
      title="Operator"
      accentWord="Profile"
      subtitle="Verify terminal node authorization logs and credential signatures"
      tabs={[...PROFILE_TABS]}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'activity' | 'security')}
    >
      <ProfileHeroCard />

      {activeTab === 'activity' ? (
        <ProfileActivityPanel
          auditLogs={auditLogs}
          isLoadingLogs={isLoadingLogs}
          filterText={filterText}
          filterType={filterType}
          onFilterTextChange={setFilterText}
          onFilterTypeChange={setFilterType}
        />
      ) : (
        <ProfileSecurityPanel
          name={name}
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          showPasswords={showPasswords}
          isSaving={isSaving}
          userName={user?.name}
          pwStrength={pwStrength}
          onNameChange={setName}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onToggleShowPasswords={() => setShowPasswords(!showPasswords)}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
        />
      )}
    </PortalSectionShell>
  );
};
