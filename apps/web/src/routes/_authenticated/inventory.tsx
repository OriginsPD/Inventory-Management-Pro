import { createFileRoute } from "@tanstack/react-router";

import { DeviceInventory } from "@/components/screens/DeviceInventory";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: DeviceInventory,
});
