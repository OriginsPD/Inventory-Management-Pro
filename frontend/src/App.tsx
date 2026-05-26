import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './components/ui/auth-context';

// Lazy load screens
const DashboardScreen = lazy(() => import('./components/screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const DeviceInventory = lazy(() => import('./components/screens/DeviceInventory').then(m => ({ default: m.DeviceInventory })));
const DeviceModels = lazy(() => import('./components/screens/DeviceModels').then(m => ({ default: m.DeviceModels })));
const CustomerDispatch = lazy(() => import('./components/screens/CustomerDispatch').then(m => ({ default: m.CustomerDispatch })));
const QCBench = lazy(() => import('./components/screens/QCBench').then(m => ({ default: m.QCBench })));
const HardwareSwaps = lazy(() => import('./components/screens/HardwareSwaps').then(m => ({ default: m.HardwareSwaps })));
const Customers = lazy(() => import('./components/screens/Customers').then(m => ({ default: m.Customers })));
const SettingsScreen = lazy(() => import('./components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const ReportsScreen = lazy(() => import('./components/screens/Reports').then(m => ({ default: m.ReportsScreen })));
const UserManagementScreen = lazy(() => import('./components/screens/UserManagementScreen').then(m => ({ default: m.UserManagementScreen })));
const LoginScreen = lazy(() => import('./components/screens/LoginScreen').then(m => ({ default: m.LoginScreen })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs font-mono tracking-widest text-primary/75">ESTABLISHING STATION LINK...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppShell>{children}</AppShell>;
};

interface LocationState {
  from?: {
    pathname: string;
  };
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs font-mono tracking-widest text-primary/75">ESTABLISHING STATION LINK...</p>
      </div>
    );
  }

  if (user) {
    const state = location.state as LocationState;
    const from = state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};



const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardScreen />
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <DeviceInventory />
            </ProtectedRoute>
          } />

          <Route path="/dispatch" element={
            <ProtectedRoute>
              <CustomerDispatch />
            </ProtectedRoute>
          } />

          <Route path="/qc" element={
            <ProtectedRoute>
              <QCBench />
            </ProtectedRoute>
          } />

          <Route path="/models" element={
            <ProtectedRoute>
              <DeviceModels />
            </ProtectedRoute>
          } />

          <Route path="/swaps" element={
            <ProtectedRoute>
              <HardwareSwaps />
            </ProtectedRoute>
          } />

          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <ReportsScreen />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute>
              <UserManagementScreen />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

