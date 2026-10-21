import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { ProtectedRoute } from '@/layout/ProtectedRoute';
import { BrainPage } from '@/pages/BrainPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PositionsPage } from '@/pages/PositionsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WalletPage } from '@/pages/WalletPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/brain" element={<BrainPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
