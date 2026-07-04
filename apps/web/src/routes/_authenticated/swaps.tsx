import { createFileRoute } from "@tanstack/react-router";

import { HardwareSwaps } from "@/components/screens/HardwareSwaps";

export const Route = createFileRoute("/_authenticated/swaps")({
  component: HardwareSwaps,
});
