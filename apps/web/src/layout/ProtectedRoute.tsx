import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (!user.onboarded && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  if (user.onboarded && location.pathname === '/onboarding') return <Navigate to="/" replace />;
  return <Outlet />;
}
