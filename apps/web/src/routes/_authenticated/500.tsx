import { createFileRoute } from "@tanstack/react-router";

import { ServerErrorScreen } from "@/components/screens/errors/ServerErrorScreen";

export const Route = createFileRoute("/_authenticated/500")({
  component: ServerErrorScreen,
});
