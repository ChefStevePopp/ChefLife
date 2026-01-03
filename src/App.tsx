import React from "react";
import { Routes, Route, Navigate, useRoutes } from "react-router-dom";
import { MainLayout, AuthLayout } from "@/shared/layouts";
import { SignIn } from "@/features/auth/components/SignIn";
import { SignUp } from "@/features/auth/components/SignUp";
import ForgotPassword from "@/features/auth/components/ForgotPassword";
import { PrivateRoute } from "@/components/PrivateRoute";
import { ROUTES } from "@/config/routes";
import { AdminRoutes } from "@/features/admin/routes";
import { KitchenRoutes } from "@/features/kitchen/routes";
import { LoadingLogo } from "@/features/shared/components";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/lib/auth/simplified-auth";
// import routes from "tempo-routes"; // TODO: Re-enable when tempo is configured

function App() {
  const { isLoading } = useAuthStore();

  // Always call useRoutes to maintain hook order
  const tempoRoutes = null; // import.meta.env.VITE_TEMPO ? useRoutes(routes) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoadingLogo
          message="Initializing authentication..."
          timeout={3000}
          onTimeout={() => {
            console.error("App loading timeout - forcing completion");
            // Force the loading state to false to prevent infinite loading
            useAuthStore.setState({ isLoading: false });
          }}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 100,
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: 'rgba(31, 41, 55, 0.95)',
            color: '#f3f4f6',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          },
          success: {
            style: {
              borderLeft: '4px solid #38bdf8',
            },
            iconTheme: {
              primary: '#38bdf8',
              secondary: '#f3f4f6',
            },
          },
          error: {
            style: {
              borderLeft: '4px solid #fb7185',
            },
            iconTheme: {
              primary: '#fb7185',
              secondary: '#f3f4f6',
            },
          },
          loading: {
            style: {
              borderLeft: '4px solid #fbbf24',
            },
            iconTheme: {
              primary: '#fbbf24',
              secondary: '#f3f4f6',
            },
          },
        }}
      />
      <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected Kitchen Routes */}
          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route path="/kitchen/*" element={<KitchenRoutes />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <PrivateRoute>
                <AdminRoutes />
              </PrivateRoute>
            }
          />

          {/* Account Routes */}
          <Route
            path="/account/*"
            element={
              <PrivateRoute>
                <AdminRoutes />
              </PrivateRoute>
            }
          />

          {/* Default Routes */}
          <Route
            path="/"
            element={<Navigate to={ROUTES.KITCHEN.DASHBOARD} replace />}
          />

          {/* Catch all redirect - but exclude tempobook paths */}
          <Route
            path="*"
            element={<Navigate to={ROUTES.KITCHEN.DASHBOARD} replace />}
          />
        </Routes>

        {/* Tempo routes - only render for tempobook paths */}
        {import.meta.env.VITE_TEMPO &&
          window.location.pathname.startsWith("/tempobook") &&
          tempoRoutes}
      </div>
    </ErrorBoundary>
  );
}

export default App;
