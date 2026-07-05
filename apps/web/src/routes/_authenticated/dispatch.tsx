import { createFileRoute } from "@tanstack/react-router";

import { CustomerDispatch } from "@/components/screens/CustomerDispatch";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/dispatch")({
  pendingComponent: routePending("table"),
  component: CustomerDispatch,
});
