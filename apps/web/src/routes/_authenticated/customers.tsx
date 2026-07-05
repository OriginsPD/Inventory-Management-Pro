import { createFileRoute } from "@tanstack/react-router";

import { Customers } from "@/components/screens/Customers";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/customers")({
  pendingComponent: routePending("table"),
  component: Customers,
});
