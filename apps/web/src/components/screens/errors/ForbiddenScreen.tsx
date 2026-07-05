import { ErrorScreen } from './ErrorScreen';

export const ForbiddenScreen = () => (
  <ErrorScreen
    status="403"
    title="Access Denied"
    description="Your terminal operator role does not have permission to access this application area."
    icon="lock"
    severity="warning"
    primaryLabel="Return Dashboard"
  />
);
