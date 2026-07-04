import { useNavigate } from '@tanstack/react-router';
import { ErrorScreen } from '../screens/errors/ErrorScreen';

interface InlineErrorStateProps {
  title: string;
  description: string;
  error?: unknown;
  onRetry?: () => void;
}

const getErrorDetails = (error?: unknown) => {
  if (!error || !(error instanceof Error)) return undefined;
  return error.message;
};

export const InlineErrorState = ({
  title,
  description,
  error,
  onRetry,
}: InlineErrorStateProps) => {
  const navigate = useNavigate();

  return (
    <ErrorScreen
      compact
      status="Data Error"
      title={title}
      description={description}
      icon="sync_problem"
      primaryLabel="Retry"
      secondaryLabel="Dashboard"
      onPrimary={onRetry}
      onSecondary={() => navigate({ to: "/dashboard" })}
      details={getErrorDetails(error)}
    />
  );
};
