import { createFileRoute } from "@tanstack/react-router";

import { QCBench } from "@/components/screens/QCBench";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/qc")({
  pendingComponent: routePending("table"),
  component: QCBench,
});
