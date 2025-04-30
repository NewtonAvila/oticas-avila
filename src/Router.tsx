import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import InvestmentForm from "./pages/InvestmentForm";
import TimeTracker from "./pages/TimeTracker";
import DataVisualization from "./pages/DataVisualization";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AdminUserManager from "./pages/AdminUserManager"; // ✅ novo!

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/investments" element={<InvestmentForm />} />
            <Route path="/time-tracker" element={<TimeTracker />} />
            <Route path="/data" element={<DataVisualization />} />
            {user.isAdmin && (
              <>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/admin-users" element={<AdminUserManager />} /> {/* ✅ nova rota */}
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
};

export default AppRoutes;
