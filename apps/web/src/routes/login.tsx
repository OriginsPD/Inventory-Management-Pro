import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useRouterState } from "@tanstack/react-router";

import { LoginScreen } from "@/components/screens/LoginScreen";
import { PageTransition } from "@/components/ui/motion";
import { PageLoader } from "@/components/ui/loading";
import { getServerSession } from "@/lib/get-session";

export const Route = createFileRoute("/login")({
  ssr: true,
  beforeLoad: async () => {
    const session = await getServerSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  pendingComponent: () => <PageLoader label="AUTH GATE" />,
  component: LoginRoute,
});

function LoginRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={pathname}>
        <LoginScreen />
      </PageTransition>
    </AnimatePresence>
  );
}
