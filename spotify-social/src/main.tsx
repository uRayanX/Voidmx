import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initCorsBypass } from './utils/cors-bypass'
import { CapacitorUpdater } from '@capgo/capacitor-updater';

initCorsBypass();
CapacitorUpdater.notifyAppReady();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
