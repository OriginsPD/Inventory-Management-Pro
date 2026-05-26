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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden select-none px-4 font-sans">
      <div className="w-full max-w-[400px] z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            <span className="text-[9px] font-mono tracking-[0.2em] text-zinc-400 uppercase">Gateway Node 01</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            IMS<span className="text-primary">PRO</span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-950 p-8 border border-zinc-800 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Authentication Required</h2>
            <p className="text-[11px] text-zinc-500 leading-normal font-medium">Provide operator credentials to initialize secure terminal session.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 font-bold flex items-start gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[14px] mt-0.5">error</span>
              <span className="leading-tight uppercase tracking-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] block ml-0.5">
                Operator ID (Email)
              </label>
              <Input
                type="email"
                placeholder="operator@imspro.com"
                className={`bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100 placeholder:text-zinc-700 transition-colors ${
                  errors.email ? 'border-red-500/50' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[9px] text-red-500 font-bold mt-1 ml-0.5 uppercase">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] block ml-0.5">
                Security Token (Password)
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`bg-zinc-900 border-zinc-800 text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-zinc-100 placeholder:text-zinc-700 transition-colors ${
                  errors.password ? 'border-red-500/50' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[9px] text-red-500 font-bold mt-1 ml-0.5 uppercase">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black rounded-none h-10 text-[10px] uppercase tracking-[0.2em] cursor-pointer transition-all disabled:opacity-50 mt-2 active:scale-[0.99]"
            >
              {isSubmitting ? 'Establishing Link...' : 'Authorize Session'}
            </Button>
          </form>

          {/* Quick-autofill Helper Box */}
          <div className="border-t border-zinc-900 pt-5">
            <button
              onClick={handleAutofillAdmin}
              className="w-full group bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 p-3 text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Emergency Bypass
                </span>
                <span className="text-[9px] font-mono text-zinc-600 block">
                  admin@imspro.com // AdminPass123!
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-zinc-700 group-hover:text-primary transition-colors">
                login
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.4em]">
            IMS-PRO // CORE-NODE // VER 3.0.0
          </p>
        </div>
      </div>
    </div>
  );
};
