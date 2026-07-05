import { createFileRoute } from "@tanstack/react-router";

import { DeviceModels } from "@/components/screens/DeviceModels";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/models")({
  pendingComponent: routePending("table"),
  component: DeviceModels,
});
