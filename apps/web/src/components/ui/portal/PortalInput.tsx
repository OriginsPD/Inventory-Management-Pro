import { Input, type InputProps } from '@ims_pro/ui/components/input';
import { cn } from '@/lib/utils';

export function PortalInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        'rounded-xl border-border bg-background/50 text-xs font-mono h-10 focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
        className,
      )}
      {...props}
    />
  );
}
