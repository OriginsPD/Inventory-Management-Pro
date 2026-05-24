import { useState } from 'react';
import { useAuth } from '../ui/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginCredentialsSchema, type LoginCredentials } from '@ims-pro/shared';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export const LoginScreen = () => {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginCredentialsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginCredentials) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(values.email, values.password);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofillAdmin = () => {
    setValue('email', 'admin@imspro.com');
    setValue('password', 'AdminPass123!');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden select-none px-4 font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[400px] z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-mono tracking-widest text-primary/80">SECURE STATION GATEWAY</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">
            IMS<span className="text-primary ml-1">Pro</span>
          </h1>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
            Asset Intelligence Lifecycle
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel-elevated p-8 rounded-2xl shadow-2xl space-y-6 border-white/5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Sign In</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">Initialize your technician terminal session to access warehouse telemetry.</p>
          </div>

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl font-semibold flex items-start gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">
                User Email
              </label>
              <Input
                type="email"
                placeholder="operator@imspro.com"
                className={`bg-background/50 border-border/50 text-sm h-11 rounded-xl focus:border-primary/40 focus:ring-primary/10 text-foreground placeholder:text-muted-foreground/30 transition-all ${
                  errors.email ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[10px] text-destructive font-semibold mt-1 ml-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">
                Access Token
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`bg-background/50 border-border/50 text-sm h-11 rounded-xl focus:border-primary/40 focus:ring-primary/10 text-foreground placeholder:text-muted-foreground/30 transition-all ${
                  errors.password ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[10px] text-destructive font-semibold mt-1 ml-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:brightness-110 text-primary-foreground font-bold rounded-xl h-11 text-xs cursor-pointer shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 active:scale-[0.98]"
            >
              {isSubmitting ? 'ESTABLISHING LINK...' : 'AUTHENTICATE SESSION'}
            </Button>
          </form>

          {/* Quick-autofill Helper Box */}
          <div className="border-t border-border/50 pt-5 mt-2">
            <button
              onClick={handleAutofillAdmin}
              className="w-full group bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/25 rounded-xl p-3 text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                  Quick Seed Access
                </span>
                <span className="text-[9px] font-mono text-muted-foreground block">
                  admin@imspro.com / AdminPass123!
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-primary group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.3em]">
            IMS NODE // SECURE LINK // AUTH-V2
          </p>
        </div>
      </div>
    </div>
  );
};
