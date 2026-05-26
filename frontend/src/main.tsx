import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from 'next-themes';
import { FeedbackProvider } from './components/ui/feedback-provider';
import { ErrorBoundary } from './components/ui/error-boundary';
import { AuthProvider } from './components/ui/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Initialize Theme and Layout Settings globally before render
(function initTheme() {
  try {
    const savedAccent = localStorage.getItem('ims_theme_accent') || 'zinc';
    if (savedAccent && savedAccent !== 'zinc') {
      document.documentElement.setAttribute('data-accent', savedAccent);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }

    const savedDensity = localStorage.getItem('ims_layout_density') || 'default';
    if (savedDensity === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }

    // Force dark mode as per SaaS-Elite design mandates if no preference is set
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'dark');
    }
    document.documentElement.classList.add('dark');
  } catch (e) {
    console.error('Theme initialization failed', e);
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
