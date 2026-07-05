import React from 'react';
import { Navigate } from '@tanstack/react-router';

import { ScreenLoadingShell } from '@/components/ui/loading';
import { useAuth, type User } from '@/components/ui/auth-context';

interface AuthorizedRouteProps {
  roles?: User['role'][];
  requireWrite?: boolean;
  children: React.ReactNode;
}

export const AuthorizedRoute = ({ roles, requireWrite, children }: AuthorizedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ScreenLoadingShell variant="tabs" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  if (requireWrite && user.role === 'REVIEWER') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
