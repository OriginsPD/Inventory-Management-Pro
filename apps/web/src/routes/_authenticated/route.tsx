import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";

import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/ui/motion";
import { ScreenLoadingShell } from "@/components/ui/loading";
import { getServerSession } from "@/lib/get-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: true,
  beforeLoad: async () => {
    const session = await getServerSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  pendingComponent: () => <ScreenLoadingShell variant="default" />,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AppShell>
      <AnimatePresence mode="sync">
        <PageTransition key={pathname} className="w-full">
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </AppShell>
  );
}
