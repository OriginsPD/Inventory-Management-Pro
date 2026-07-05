import React from "react";
import { Navigate } from "@tanstack/react-router";

import { ScreenLoadingShell } from "@/components/ui/loading";
import { useAuth, type User } from "@/components/ui/auth-context";

interface AuthorizedRouteProps {
  roles: User["role"][];
  children: React.ReactNode;
}

export const AuthorizedRoute = ({ roles, children }: AuthorizedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ScreenLoadingShell variant="tabs" />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
