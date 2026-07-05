import { createFileRoute } from "@tanstack/react-router";

import { AuthorizedRoute } from "@/components/routing/AuthorizedRoute";
import { SuperUserHubScreen } from "@/components/screens/SuperUserHubScreen";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/superuser")({
  pendingComponent: routePending("tabs"),
  component: SuperUserRoute,
});

function SuperUserRoute() {
  return (
    <AuthorizedRoute roles={["SUPER_USER"]}>
      <SuperUserHubScreen />
    </AuthorizedRoute>
  );
}
