import { createFileRoute } from "@tanstack/react-router";

import { AuthorizedRoute } from "@/components/routing/AuthorizedRoute";
import { SuperUserHubScreen } from "@/components/screens/SuperUserHubScreen";

export const Route = createFileRoute("/_authenticated/superuser")({
  component: SuperUserRoute,
});

function SuperUserRoute() {
  return (
    <AuthorizedRoute roles={["SUPER_USER"]}>
      <SuperUserHubScreen />
    </AuthorizedRoute>
  );
}
