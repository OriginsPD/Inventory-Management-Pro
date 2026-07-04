import { createFileRoute } from "@tanstack/react-router";

import { DeviceModels } from "@/components/screens/DeviceModels";

export const Route = createFileRoute("/_authenticated/models")({
  component: DeviceModels,
});
