import { createFileRoute } from "@tanstack/react-router";

import { ReportsScreen } from "@/components/screens/Reports";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsScreen,
});
