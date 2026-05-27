import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';

interface ErrorScreenProps {
  status: string;
  title: string;
  description: string;
  icon?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  compact?: boolean;
  details?: string;
}

export const ErrorScreen = ({
  status,
  title,
  description,
  icon = 'warning',
  primaryLabel = 'Return Dashboard',
  secondaryLabel = 'Go Back',
  onPrimary,
  onSecondary,
  compact = false,
  details,
}: ErrorScreenProps) => {
  const navigate = useNavigate();

  const handlePrimary = onPrimary || (() => navigate('/'));
  const handleSecondary = onSecondary || (() => navigate(-1));

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center text-foreground',
        compact ? 'min-h-[260px] p-4' : 'min-h-[calc(100vh-8rem)] p-6'
      )}
    >
      <div className={cn('w-full text-center space-y-6', compact ? 'max-w-md' : 'max-w-xl')}>
        <div className="mx-auto h-14 w-14 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono font-black text-primary uppercase tracking-[0.35em]">{status}</p>
          <h1 className={cn('font-black tracking-tight text-white uppercase', compact ? 'text-xl' : 'text-3xl')}>
            {title}
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">{description}</p>
        </div>

        {details && (
          <pre className="text-left text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 p-3 max-h-40 overflow-auto whitespace-pre-wrap">
            {details}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            onClick={handlePrimary}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-none h-10 px-5 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            {primaryLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSecondary}
            className="w-full sm:w-auto text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none h-10 px-5 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            {secondaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
