import { createFileRoute } from "@tanstack/react-router";

import { OfflineScreen } from "@/components/screens/errors/OfflineScreen";

export const Route = createFileRoute("/_authenticated/offline")({
  component: OfflineScreen,
});
