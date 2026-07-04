import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/ui/auth-context";
import { useFeedback } from '@/components/ui/feedback-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginCredentialsSchema, type LoginCredentials } from '@ims_pro/shared';
import { Input } from '@ims_pro/ui/components/input';
import { Button } from '@ims_pro/ui/components/button';
import { Link } from '@tanstack/react-router';
import { FaviconBg } from '@/components/ui/FaviconBg';
import { IMSBrandLogo } from '@/components/ui/IMSBrandLogo';

export const LoginScreen = () => {
  const { login } = useAuth();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
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
      const data = await login(values.email, values.password);
      if (data && data.user) {
        toast.success(`Welcome back, ${data.user.name}`);
        navigate({ to: "/dashboard" });
      }
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden select-none px-4 font-sans">
      <FaviconBg className="-top-48 -right-48 w-[800px] h-[800px] sm:-top-80 sm:-right-80 sm:w-[1200px] sm:h-[1200px] opacity-[0.08] dark:opacity-[0.02] rotate-[-15deg] text-foreground" />
      <div className="w-full max-w-[400px] z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center flex justify-center">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <IMSBrandLogo size={48} className="justify-center" showText={true} />
          </Link>
        </div>

        {/* Login Card */}

        {/* Login Card */}
        <div className="bg-card p-8 border border-border shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Authentication Required</h2>
            <p className="text-[11px] text-muted-foreground leading-normal font-medium">Provide operator credentials to initialize secure terminal session.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 font-bold flex items-start gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[14px] mt-0.5">error</span>
              <span className="leading-tight uppercase tracking-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] block ml-0.5">
                Operator ID (Email)
              </label>
              <Input
                type="email"
                placeholder="operator@imspro.com"
                className={`bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground placeholder:text-muted-foreground/60 transition-colors ${
                  errors.email ? 'border-red-500/50' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[9px] text-red-500 font-bold mt-1 ml-0.5 uppercase">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] block ml-0.5">
                Security Token (Password)
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`bg-background border-border text-xs h-10 rounded-none focus:border-primary/50 focus:ring-0 text-foreground placeholder:text-muted-foreground/60 transition-colors ${
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
              className="w-full font-black rounded-none h-10 text-[10px] uppercase tracking-[0.2em] cursor-pointer transition-all disabled:opacity-50 mt-2 active:scale-[0.99]"
            >
              {isSubmitting ? 'Establishing Link...' : 'Authorize Session'}
            </Button>
          </form>

        </div>


      </div>
    </div>
  );
};
