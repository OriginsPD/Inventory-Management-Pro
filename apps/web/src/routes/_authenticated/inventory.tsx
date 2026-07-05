import { createFileRoute } from "@tanstack/react-router";

import { DeviceInventory } from "@/components/screens/DeviceInventory";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/inventory")({
  pendingComponent: routePending("table"),
  component: DeviceInventory,
});
