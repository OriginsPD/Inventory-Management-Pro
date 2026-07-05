import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ims_pro/ui/components/button';
import { cn } from "@/lib/utils";
import { FadeUp, Stagger, StaggerItem } from '@/components/ui/motion';

export type ErrorSeverity = "error" | "warning" | "info" | "neutral";

interface ErrorScreenProps {
  status: string;
  title: string;
  description: string;
  icon?: string;
  severity?: ErrorSeverity;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  compact?: boolean;
  details?: string;
}

const severityStyles: Record<
  ErrorSeverity,
  { iconBox: string; statusLabel: string; primaryButton: string }
> = {
  error: {
    iconBox: "bg-destructive/5 border-destructive/10 text-destructive",
    statusLabel: "text-destructive",
    primaryButton: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
  warning: {
    iconBox: "bg-accent/5 border-accent/10 text-accent",
    statusLabel: "text-accent",
    primaryButton: "bg-accent hover:bg-accent/90 text-accent-foreground",
  },
  info: {
    iconBox: "bg-accent/5 border-accent/10 text-accent",
    statusLabel: "text-accent",
    primaryButton: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  neutral: {
    iconBox: "bg-primary/5 border-primary/10 text-primary",
    statusLabel: "text-muted-foreground",
    primaryButton: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
};

export const ErrorScreen = ({
  status,
  title,
  description,
  icon = 'warning',
  severity = "neutral",
  primaryLabel = 'Return Dashboard',
  secondaryLabel = 'Go Back',
  onPrimary,
  onSecondary,
  compact = false,
  details,
}: ErrorScreenProps) => {
  const navigate = useNavigate();
  const styles = severityStyles[severity];

  const handlePrimary = onPrimary || (() => navigate({ to: "/dashboard" }));
  const handleSecondary = onSecondary || (() => window.history.back());

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center text-foreground',
        compact ? 'min-h-[260px] p-4' : 'min-h-[calc(100vh-8rem)] p-6'
      )}
    >
      <Stagger className={cn('w-full text-center space-y-6', compact ? 'max-w-md' : 'max-w-xl')}>
        <FadeUp>
        <div
          className={cn(
            "mx-auto h-14 w-14 rounded-xl border flex items-center justify-center",
            styles.iconBox,
          )}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        </FadeUp>

        <StaggerItem className="space-y-2">
          <p
            className={cn(
              "text-[10px] font-mono font-black uppercase tracking-[0.35em]",
              styles.statusLabel,
            )}
          >
            {status}
          </p>
          <h1 className={cn('font-black tracking-tight text-foreground uppercase', compact ? 'text-xl' : 'text-3xl')}>
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">{description}</p>
        </StaggerItem>

        {details && (
          <StaggerItem>
            <pre className="text-left text-[10px] font-mono text-muted-foreground bg-card border border-border p-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md">
            {details}
          </pre>
          </StaggerItem>
        )}

        <StaggerItem>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            onClick={handlePrimary}
            className={cn(
              "w-full sm:w-auto rounded-md h-10 px-5 text-[10px] font-black uppercase tracking-[0.2em]",
              styles.primaryButton,
            )}
          >
            {primaryLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSecondary}
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground hover:bg-muted rounded-md h-10 px-5 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            {secondaryLabel}
          </Button>
        </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
};
