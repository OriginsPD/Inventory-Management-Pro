import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from './components/layout/AppShell';
import { Skeleton } from './components/ui/skeleton';

const DashboardScreen = React.lazy(() => import('./components/screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const DeviceInventory = React.lazy(() => import('./components/screens/DeviceInventory').then(m => ({ default: m.DeviceInventory })));
const DeviceModels = React.lazy(() => import('./components/screens/DeviceModels').then(m => ({ default: m.DeviceModels })));
const CustomerDispatch = React.lazy(() => import('./components/screens/CustomerDispatch').then(m => ({ default: m.CustomerDispatch })));
const QCBench = React.lazy(() => import('./components/screens/QCBench').then(m => ({ default: m.QCBench })));
const HardwareSwaps = React.lazy(() => import('./components/screens/HardwareSwaps').then(m => ({ default: m.HardwareSwaps })));
const Customers = React.lazy(() => import('./components/screens/Customers').then(m => ({ default: m.Customers })));
const SettingsScreen = React.lazy(() => import('./components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const ReportsScreen = React.lazy(() => import('./components/screens/Reports').then(m => ({ default: m.ReportsScreen })));
const UserManagementScreen = React.lazy(() => import('./components/screens/UserManagementScreen').then(m => ({ default: m.UserManagementScreen })));
const LoginScreen = React.lazy(() => import('./components/screens/LoginScreen').then(m => ({ default: m.LoginScreen })));

import { ThemeProvider } from 'next-themes';
import { FeedbackProvider } from './components/ui/feedback-provider';
import { ErrorBoundary } from './components/ui/error-boundary';
import { AuthProvider, useAuth } from './components/ui/auth-context';
import './index.css';

const App = () => {
  const [path, setPath] = React.useState(window.location.pathname);
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && !anchor.target && !e.defaultPrevented) {
        const url = new URL(anchor.href);
        if (url.origin === window.location.origin) {
          e.preventDefault();
          if (window.location.pathname !== url.pathname) {
            window.history.pushState({}, '', url.pathname);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#081326] space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs font-mono tracking-widest text-primary/75">ESTABLISHING STATION LINK...</p>
      </div>
    );
  }

  if (!user) {
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    return (
      <React.Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#081326]">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      }>
        <LoginScreen />
      </React.Suspense>
    );
  }
  
  const renderScreen = () => {
    if (path === '/models') {
      return <DeviceModels />;
    }

    if (path === '/dispatch') {
      return <CustomerDispatch />;
    }

    if (path === '/qc') {
      return <QCBench />;
    }

    if (path === '/swaps') {
      return <HardwareSwaps />;
    }

    if (path === '/customers') {
      return <Customers />;
    }

    if (path === '/inventory') {
      return <DeviceInventory />;
    }

    if (path === '/settings') {
      return <SettingsScreen />;
    }

    if (path === '/reports') {
      return <ReportsScreen />;
    }

    if (path === '/users') {
      if (user.role !== 'SUPER_USER') return <DashboardScreen />;
      return <UserManagementScreen />;
    }
    
    return <DashboardScreen />;
  };

  return (
    <AppShell>
      <React.Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3 bg-primary/10" />
          <Skeleton className="h-4 w-1/2 bg-primary/10" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <Skeleton className="h-32 bg-primary/10 rounded-2xl" />
            <Skeleton className="h-32 bg-primary/10 rounded-2xl" />
            <Skeleton className="h-32 bg-primary/10 rounded-2xl" />
          </div>
          <Skeleton className="h-64 bg-primary/10 rounded-2xl mt-6" />
        </div>
      }>
        {renderScreen()}
      </React.Suspense>
    </AppShell>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
