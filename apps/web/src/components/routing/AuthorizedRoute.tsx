import React from "react";
import { Navigate } from "@tanstack/react-router";

import { useAuth, type User } from "@/components/ui/auth-context";

interface AuthorizedRouteProps {
  roles: User["role"][];
  children: React.ReactNode;
}

export const AuthorizedRoute = ({ roles, children }: AuthorizedRouteProps) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
