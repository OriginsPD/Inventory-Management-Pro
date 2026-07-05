import { EmptyState } from '@/components/ui/empty-state';
import { PortalButton } from '@/components/ui/portal';

interface EmptyOpsStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyOpsState({ icon = 'inventory_2', title, description, actionLabel, onAction }: EmptyOpsStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        actionLabel && onAction ? (
          <PortalButton onClick={onAction}>{actionLabel}</PortalButton>
        ) : undefined
      }
    />
  );
}
