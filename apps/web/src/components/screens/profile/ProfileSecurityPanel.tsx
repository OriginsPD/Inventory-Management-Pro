import { Button } from '@ims_pro/ui/components/button';
import { Input } from '@ims_pro/ui/components/input';

interface ProfileSecurityPanelProps {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showPasswords: boolean;
  isSaving: boolean;
  userName?: string;
  pwStrength: number;
  onNameChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowPasswords: () => void;
  onUpdateProfile: () => void;
  onChangePassword: () => void;
}

export function ProfileSecurityPanel({
  name,
  currentPassword,
  newPassword,
  confirmPassword,
  showPasswords,
  isSaving,
  userName,
  pwStrength,
  onNameChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPasswords,
  onUpdateProfile,
  onChangePassword,
}: ProfileSecurityPanelProps) {
  return (
    <div className="space-y-10">
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
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Operator Name"
              className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
            />
            <Button
              onClick={onUpdateProfile}
              disabled={isSaving || !name.trim() || name === userName}
              className="bg-primary hover:bg-primary/95 text-white rounded-lg px-6 h-10 text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Commit Profile Name
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-[0.25em]">Credential Verification Key</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              placeholder="Current security token"
              className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground pr-10 font-mono"
            />
            <button
              type="button"
              onClick={onToggleShowPasswords}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPasswords ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="New security token"
                className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
              />

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
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Confirm new token"
              className="bg-background border-border text-xs h-10 rounded-lg focus:border-primary/50 focus:ring-0 text-foreground font-mono"
            />
          </div>

          <Button
            onClick={onChangePassword}
            disabled={isSaving || !newPassword || newPassword !== confirmPassword}
            className="w-full bg-primary hover:bg-primary/95 text-white font-black rounded-lg h-11 text-[9px] uppercase tracking-[0.25em] transition-all active:scale-[0.99] mt-2 shadow-sm shadow-primary/5"
          >
            Commit Security Tokens
          </Button>
        </div>
      </div>
    </div>
  );
}
