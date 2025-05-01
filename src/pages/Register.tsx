import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const { register, error } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    if (!firstName || !lastName || !username || !email || !password) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }

    const success = await register(firstName, lastName, username, email, password);
    if (success) {
      navigate('/');
    } else {
      setLocalError(error || 'Erro ao registrar usuário.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md text-center space-y-6">
        <img src="/oticas_avila_logo.png" alt="Óticas Ávila" className="w-24 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Criar Conta</h1>

        <div className="space-y-4 text-left">
          <div>
            <label className="label">Nome</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="label">Sobrenome</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
              placeholder="Seu sobrenome"
            />
          </div>

          <div>
            <label className="label">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="ex: fulano123"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
        </div>

        {localError && <p className="text-red-500 text-sm">{localError}</p>}

        <button
          onClick={handleRegister}
          className="btn-primary w-full"
        >
          Registrar
        </button>
      </div>
    </div>
  );
};

export default Register;
