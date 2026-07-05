import { createFileRoute } from '@tanstack/react-router';

import { DeviceDetailScreen } from '@/components/screens/DeviceDetailScreen';
import { routePending } from '@/components/ui/loading';

export const Route = createFileRoute('/_authenticated/devices/$deviceId')({
  pendingComponent: routePending('profile'),
  component: DeviceDetailScreen,
});
