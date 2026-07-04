import { createFileRoute } from "@tanstack/react-router";

import { CustomerDispatch } from "@/components/screens/CustomerDispatch";

export const Route = createFileRoute("/_authenticated/dispatch")({
  component: CustomerDispatch,
});
