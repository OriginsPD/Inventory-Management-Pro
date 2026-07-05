import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";

import { LandingScreen } from "@/components/screens/LandingScreen";
import { PageTransition } from "@/components/ui/motion";
import { getServerSession } from "@/lib/get-session";

export const Route = createFileRoute("/")({
  ssr: true,
  beforeLoad: async () => {
    const session = await getServerSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LandingRoute,
});

function LandingRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={pathname}>
        <LandingScreen />
      </PageTransition>
    </AnimatePresence>
  );
}
