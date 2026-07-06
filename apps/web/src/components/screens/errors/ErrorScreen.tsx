import { useNavigate } from '@tanstack/react-router';
import { PortalButton } from '@/components/ui/portal';
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
  { iconBox: string; statusLabel: string }
> = {
  error: {
    iconBox: "bg-[var(--status-danger-bg)] border-transparent text-[var(--status-danger-fg)]",
    statusLabel: "text-[var(--status-danger-fg)]",
  },
  warning: {
    iconBox: "bg-[var(--status-warning-bg)] border-transparent text-[var(--status-warning-fg)]",
    statusLabel: "text-[var(--status-warning-fg)]",
  },
  info: {
    iconBox: "bg-[var(--status-info-bg)] border-transparent text-[var(--status-info-fg)]",
    statusLabel: "text-[var(--status-info-fg)]",
  },
  neutral: {
    iconBox: "bg-muted border-border text-muted-foreground",
    statusLabel: "text-muted-foreground",
  },
};

export const ErrorScreen = ({
  status,
  title,
  description,
  icon = 'warning',
  severity = "neutral",
  primaryLabel = 'Return to dashboard',
  secondaryLabel = 'Go back',
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
            "mx-auto h-14 w-14 rounded-lg border flex items-center justify-center",
            styles.iconBox,
          )}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        </FadeUp>

        <StaggerItem className="space-y-2">
          <p className={cn("text-xs font-mono uppercase tracking-wider", styles.statusLabel)}>
            {status}
          </p>
          <h1 className={cn('font-serif tracking-tight text-foreground', compact ? 'text-xl' : 'text-3xl')} style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">{description}</p>
        </StaggerItem>

        {details && (
          <StaggerItem>
            <pre className="text-left text-xs font-mono text-muted-foreground bg-card border border-border p-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md">
            {details}
          </pre>
          </StaggerItem>
        )}

        <StaggerItem>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <PortalButton onClick={handlePrimary} className="w-full sm:w-auto">
            {primaryLabel}
          </PortalButton>
          <PortalButton variant="ghost" onClick={handleSecondary} className="w-full sm:w-auto text-muted-foreground">
            {secondaryLabel}
          </PortalButton>
        </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
};
