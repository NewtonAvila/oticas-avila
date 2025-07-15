import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Login: React.FC = () => {
  const { login, error } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-gray-700 dark:text-gray-200"
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md text-center space-y-6 text-gray-800 dark:text-white">
        <h1 className="text-2xl font-bold">Bem-vindo!</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Acesse sua conta</p>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: fulano123"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200"
        >
          Entrar
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>
            Não tem uma conta?{' '}
            <span
              className="text-blue-600 hover:underline cursor-pointer"
              onClick={() => navigate('/register')}
            >
              Registrar
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;