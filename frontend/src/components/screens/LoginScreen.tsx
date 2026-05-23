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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#081326] relative overflow-hidden select-none px-4">
      {/* Background Decorative Rings */}
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
            <span className="text-[10px] font-mono tracking-widest text-[#d8e2fd]">SECURE STATION GATEWAY</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#d8e2fd] via-[#7dd3fc] to-primary">
            IMS Pro
          </h1>
          <p className="text-xs text-[#bec8ce] font-mono uppercase tracking-wider">
            Asset Intelligence Lifecycle Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f1524]/60 border border-primary/15 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-[#d8e2fd]">Sign In</h2>
            <p className="text-xs text-[#bec8ce]">Provide credentials to initialize your user terminal session.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold flex items-start gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#bec8ce] uppercase tracking-wider block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="operator@imspro.com"
                className={`bg-[#081326]/50 border-primary/10 text-xs h-10 rounded-xl focus:border-primary/40 focus:ring-primary/10 text-[#d8e2fd] placeholder:text-muted-foreground/30 ${
                  errors.email ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#bec8ce] uppercase tracking-wider block">
                Access Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`bg-[#081326]/50 border-primary/10 text-xs h-10 rounded-xl focus:border-primary/40 focus:ring-primary/10 text-[#d8e2fd] placeholder:text-muted-foreground/30 ${
                  errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-[#081326] font-bold rounded-xl h-10 text-xs cursor-pointer shadow-lg transition-all hover:shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? 'Establishing Session...' : 'Authenticate Terminal'}
            </Button>
          </form>

          {/* Quick-autofill Helper Box */}
          <div className="border-t border-primary/10 pt-4 mt-2">
            <button
              onClick={handleAutofillAdmin}
              className="w-full group bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/25 rounded-xl p-3 text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                  Quick Seed Access
                </span>
                <span className="text-[9px] font-mono text-[#bec8ce] block">
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
          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
            NODE SECURE LINK // AUTH BY BETTER-AUTH
          </p>
        </div>
      </div>
    </div>
  );
};
