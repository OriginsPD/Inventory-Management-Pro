import { createFileRoute } from "@tanstack/react-router";

import { UserProfileScreen } from "@/components/screens/UserProfileScreen";

export const Route = createFileRoute("/_authenticated/profile")({
  component: UserProfileScreen,
});
