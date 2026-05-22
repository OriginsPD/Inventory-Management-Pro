import React from 'react';
import ReactDOM from 'react-dom/client';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { DeviceInventory } from './components/screens/DeviceInventory';
import { DeviceModels } from './components/screens/DeviceModels';
import { CustomerDispatch } from './components/screens/CustomerDispatch';
import { QCBench } from './components/screens/QCBench';
import { HardwareSwaps } from './components/screens/HardwareSwaps';
import { Customers } from './components/screens/Customers';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ReportsScreen } from './components/screens/Reports';
import { ThemeProvider } from 'next-themes';
import './index.css';

const App = () => {
  const [path, setPath] = React.useState(window.location.pathname);

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
  
  return <DashboardScreen />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
