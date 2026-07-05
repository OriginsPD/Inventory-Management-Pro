import {
  ScreenLoadingShell,
  type ScreenLoadingVariant,
} from "./screen-loading-shell";

/** TanStack Router pendingComponent factory — renders inside AppShell outlet. */
export function routePending(variant: ScreenLoadingVariant = "default") {
  function RoutePending() {
    return <ScreenLoadingShell variant={variant} />;
  }
  return RoutePending;
}
