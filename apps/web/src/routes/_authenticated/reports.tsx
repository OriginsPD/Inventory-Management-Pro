import { createFileRoute } from "@tanstack/react-router";

import { ReportsScreen } from "@/components/screens/Reports";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/reports")({
  pendingComponent: routePending("dashboard"),
  component: ReportsScreen,
});
