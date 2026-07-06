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
import { FadeUp, MotionPresenceBanner } from '@/components/ui/motion';

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
        <FadeUp className="text-center flex justify-center">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <IMSBrandLogo size={48} className="justify-center" showText={true} />
          </Link>
        </FadeUp>

        <FadeUp delay={0.08}>
        <div className="surface-card p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl tracking-tight text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">Enter your operator credentials to access the portal.</p>
          </div>

          {errorMsg && (
            <MotionPresenceBanner show={!!errorMsg} className="w-full">
              <div
                role="alert"
                className="flex items-center gap-2 bg-[var(--status-danger-bg)] border border-transparent text-[var(--status-danger-fg)] px-3 py-2 text-sm rounded-md"
              >
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            </MotionPresenceBanner>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                Email
              </label>
              <Input
                type="email"
                placeholder="operator@imspro.com"
                className={`bg-card border-border text-sm h-10 rounded-md focus:border-foreground/30 focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground ${
                  errors.email ? 'border-[var(--status-danger-fg)]' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-[var(--status-danger-fg)] mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`bg-card border-border text-sm h-10 rounded-md focus:border-foreground/30 focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground ${
                  errors.password ? 'border-[var(--status-danger-fg)]' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-[var(--status-danger-fg)] mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-medium rounded-md h-10 text-sm cursor-pointer transition-all disabled:opacity-50 mt-2 active:scale-[0.98] bg-primary text-primary-foreground hover:bg-[#333333] dark:hover:bg-[#e7e5e4]"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

        </div>
        </FadeUp>
      </div>
    </div>
  );
};
