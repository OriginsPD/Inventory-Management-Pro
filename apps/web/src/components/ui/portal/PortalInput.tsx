import { Input, type InputProps } from '@ims_pro/ui/components/input';
import { cn } from '@/lib/utils';

export function PortalInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        'rounded-md border-border bg-card text-sm h-10 focus:border-foreground/30 focus:ring-1 focus:ring-ring',
        className,
      )}
      {...props}
    />
  );
}
