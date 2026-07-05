import { ErrorScreen } from './ErrorScreen';

export const NotFoundScreen = () => (
  <ErrorScreen
    status="404"
    title="Page Not Found"
    description="The IMS terminal route you requested does not exist or has been moved."
    icon="travel_explore"
    severity="neutral"
  />
);
