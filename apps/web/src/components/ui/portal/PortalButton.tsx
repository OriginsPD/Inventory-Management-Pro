import { Button, type ButtonProps } from '@ims_pro/ui/components/button';
import { cn } from '@/lib/utils';

export function PortalButton({ className, size = 'default', ...props }: ButtonProps) {
  return (
    <Button
      size={size}
      className={cn(
        'rounded-md text-sm font-medium transition-all duration-200 active:scale-[0.98] min-h-[44px] sm:min-h-9',
        className,
      )}
      {...props}
    />
  );
}
