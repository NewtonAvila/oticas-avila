import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ChevronLeft, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
};

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    root.classList.toggle('dark');

    // opcional: salvar preferência no localStorage
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} className="text-gray-800 dark:text-gray-200" />
            </button>
          )}

          {/* Logo */}
          <img
            src="/oticas_avila_symbol.png"
            alt="Óticas Ávila"
            className="h-12 w-auto object-contain"
          />

          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {title}
          </h1>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user.username}
            </p>

            {/* Botão de logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Sair"
            >
              <LogOut size={20} />
            </button>

            {/* Botão de alternância de tema */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Alternar tema"
            >
              <Sun size={18} className="block dark:hidden text-gray-700" />
              <Moon size={18} className="hidden dark:block text-gray-200" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
