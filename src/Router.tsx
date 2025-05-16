// src/Router.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import InvestmentForm from "./pages/InvestmentForm";
import TimeTracker from "./pages/TimeTracker";
import DataVisualization from "./pages/DataVisualization";
import RegisterDebt from "./pages/RegisterDebt";
import RegisterProduct from "./pages/RegisterProduct";
import RegisterSale from "./pages/RegisterSale";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./pages/AdminPanel";
import AdminUserManager from "./pages/AdminUserManager";
import CashControl from "./pages/CashControl";

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {user ? (
          <>
            {/* Tela principal */}
            <Route path="/" element={<Dashboard />} />

            {/* Funcionalidades do usuário */}
            <Route path="/investments" element={<InvestmentForm />} />
            <Route path="/time-tracker" element={<TimeTracker />} />
            <Route path="/data" element={<DataVisualization />} />
            <Route path="/register-debt" element={<RegisterDebt />} />
            <Route path="/register-product" element={<RegisterProduct />} />
            <Route path="/register-sale" element={<RegisterSale />} />
            <Route path="/cash-control" element={<CashControl />} /> {/* 🔹 Nova rota adicionada */}

            {/* Painel de admin */}
            {user.isAdmin && (
              <>
                <Route path="/admin" element={<AdminPanel />} />
                <Route
                  path="/admin-users"
                  element={<AdminUserManager />}
                />
              </>
            )}

            {/* Qualquer outra URL redireciona para a home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {/* Login / Registro */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />
          </>
        )}
      </Routes>
    </Router>
  );
};

export default AppRoutes;