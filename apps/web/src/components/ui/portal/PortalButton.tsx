import { Button, type ButtonProps } from '@ims_pro/ui/components/button';
import { cn } from '@/lib/utils';

export function PortalButton({ className, size = 'default', ...props }: ButtonProps) {
  return (
    <Button
      size={size}
      className={cn(
        'rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] min-h-[44px] sm:min-h-0',
        className,
      )}
      {...props}
    />
  );
}
