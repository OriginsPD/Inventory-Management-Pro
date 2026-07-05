import { createFileRoute } from "@tanstack/react-router";

import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/dashboard")({
  pendingComponent: routePending("dashboard"),
  component: DashboardScreen,
});
