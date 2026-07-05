import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/settings")({
  pendingComponent: routePending("form"),
  component: SettingsScreen,
});
