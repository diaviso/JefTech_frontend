import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingSpinner } from './components/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import ShopListPage from './pages/ShopListPage';
import CreateShopPage from './pages/CreateShopPage';
import ShopSettingsPage from './pages/ShopSettingsPage';
import ShopDetailPage from './pages/ShopDetailPage';
import JoinShopPage from './pages/JoinShopPage';
import type { ReactNode } from 'react';
import './index.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/shops" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/join/:code" element={<JoinShopPage />} />
      <Route
        path="/shops"
        element={
          <ProtectedRoute>
            <ShopListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shops/new"
        element={
          <ProtectedRoute>
            <CreateShopPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shops/:id/settings"
        element={
          <ProtectedRoute>
            <ShopSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shops/:id"
        element={
          <ProtectedRoute>
            <ShopDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
