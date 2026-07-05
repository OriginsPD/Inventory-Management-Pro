import { createFileRoute } from "@tanstack/react-router";

import { UserProfileScreen } from "@/components/screens/UserProfileScreen";
import { routePending } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/profile")({
  pendingComponent: routePending("profile"),
  component: UserProfileScreen,
});
