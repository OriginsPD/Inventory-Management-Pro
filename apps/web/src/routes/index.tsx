import { createFileRoute, redirect } from "@tanstack/react-router";

import { LandingScreen } from "@/components/screens/LandingScreen";
import { getServerSession } from "@/lib/get-session";

export const Route = createFileRoute("/")({
  ssr: true,
  beforeLoad: async () => {
    const session = await getServerSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LandingScreen,
});
