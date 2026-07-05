import { useEffect } from "react";
import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";

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

  useEffect(() => {
    const main = document.querySelector("[data-portal-main]");
    if (main instanceof HTMLElement) {
      main.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return (
    <AppShell>
      <PageTransition key={pathname} className="w-full">
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
