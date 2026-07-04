import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginScreen } from "@/components/screens/LoginScreen";
import { getServerSession } from "@/lib/get-session";

export const Route = createFileRoute("/login")({
  ssr: true,
  beforeLoad: async () => {
    const session = await getServerSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginScreen,
});
