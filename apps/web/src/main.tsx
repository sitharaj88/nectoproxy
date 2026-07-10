import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { initToken } from './services/token';
import { TooltipProvider } from './components/ui/Tooltip';
import './index.css';

// Capture/persist the session token from the URL before anything makes a request.
initToken();

// Apply the persisted (or dark-first default) theme class before first paint
// to avoid a flash of the wrong theme.
{
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'dark';
  const resolved =
    stored === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : stored;
  document.documentElement.classList.add(resolved === 'light' ? 'light' : 'dark');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
