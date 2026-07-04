import { createFileRoute } from "@tanstack/react-router";

import { QCBench } from "@/components/screens/QCBench";

export const Route = createFileRoute("/_authenticated/qc")({
  component: QCBench,
});
