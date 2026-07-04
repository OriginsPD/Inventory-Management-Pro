import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenScreen } from "@/components/screens/errors/ForbiddenScreen";

export const Route = createFileRoute("/_authenticated/403")({
  component: ForbiddenScreen,
});
