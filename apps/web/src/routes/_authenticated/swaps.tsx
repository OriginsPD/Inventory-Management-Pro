import { createFileRoute } from "@tanstack/react-router";

import { HardwareSwaps } from "@/components/screens/HardwareSwaps";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/swaps")({
  pendingComponent: routePending("table"),
  component: HardwareSwaps,
});
