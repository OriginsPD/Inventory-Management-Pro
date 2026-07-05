import { ErrorScreen } from './ErrorScreen';

export const ServerErrorScreen = () => (
  <ErrorScreen
    status="500"
    title="System Error"
    description="The IMS terminal encountered an unexpected failure. Retry the workflow or return to the dashboard."
    icon="error"
    severity="error"
    primaryLabel="Return Dashboard"
    secondaryLabel="Reload Terminal"
    onSecondary={() => window.location.reload()}
  />
);
