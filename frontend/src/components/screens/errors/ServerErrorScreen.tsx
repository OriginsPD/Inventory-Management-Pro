import { ErrorScreen } from './ErrorScreen';

export const ServerErrorScreen = () => (
  <ErrorScreen
    status="500"
    title="System Error"
    description="The IMS API or frontend runtime encountered an unexpected failure. Retry the workflow or return to the dashboard."
    icon="error"
    primaryLabel="Return Dashboard"
    secondaryLabel="Reload"
    onSecondary={() => window.location.reload()}
  />
);
