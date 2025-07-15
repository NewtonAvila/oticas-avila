import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterDebt from './pages/RegisterDebt';
import RegisterEntry from './pages/RegisterEntry';
import DataVisualization from './pages/DataVisualization';
import UnplannedExpenses from './pages/UnplannedExpenses';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register-debt"
          element={
            <ProtectedRoute>
              <RegisterDebt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register-entry"
          element={
            <ProtectedRoute>
              <RegisterEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-visualization"
          element={
            <ProtectedRoute>
              <DataVisualization />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unplanned-expenses"
          element={
            <ProtectedRoute>
              <UnplannedExpenses />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
          <AppRouter />
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;