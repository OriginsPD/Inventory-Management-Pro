import { createFileRoute } from '@tanstack/react-router';

import { AlertsScreen } from '@/components/screens/AlertsScreen';
import { routePending } from '@/components/ui/loading';

export const Route = createFileRoute('/_authenticated/alerts')({
  pendingComponent: routePending('table'),
  component: AlertsScreen,
});
