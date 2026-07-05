import { ErrorScreen } from './ErrorScreen';

export const OfflineScreen = () => (
  <ErrorScreen
    status="Offline"
    title="Network Unavailable"
    description="The terminal cannot reach the IMS API. Check connectivity, then retry the workflow."
    icon="wifi_off"
    severity="warning"
    secondaryLabel="Reload Terminal"
    onSecondary={() => window.location.reload()}
  />
);
