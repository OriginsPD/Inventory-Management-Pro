import { useFeedback } from '@/components/ui/feedback-provider';
import { cn } from '@/lib/utils';

interface DeviceIdentifierChipProps {
  identifier: string;
  deviceId?: string;
  className?: string;
}

export function DeviceIdentifierChip({ identifier, deviceId, className }: DeviceIdentifierChipProps) {
  const { toast } = useFeedback();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      toast.info('Identifier copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const content = (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-mono font-black bg-muted/60 px-2 py-1 border border-border/60 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors min-h-[44px] sm:min-h-0',
        className,
      )}
      title="Click to copy"
    >
      <span className="material-symbols-outlined text-[14px] text-primary">barcode</span>
      {identifier}
    </button>
  );

  if (deviceId) {
    return (
      <a href={`/devices/${deviceId}`} className="no-underline" onClick={(e) => e.stopPropagation()}>
        {content}
      </a>
    );
  }

  return content;
}
