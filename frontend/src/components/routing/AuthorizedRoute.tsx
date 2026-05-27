import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type User } from '../ui/auth-context';

interface AuthorizedRouteProps {
  roles: User['role'][];
  children: React.ReactNode;
}

export const AuthorizedRoute = ({ roles, children }: AuthorizedRouteProps) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
