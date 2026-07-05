import { useAuth } from '@/components/ui/auth-context';

export function useCanWrite() {
  const { user } = useAuth();
  return user?.role !== 'REVIEWER';
}

export function useIsSuperUser() {
  const { user } = useAuth();
  return user?.role === 'SUPER_USER';
}
