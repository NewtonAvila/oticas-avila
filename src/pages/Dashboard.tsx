// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getTotalInvestment, getUserInvestmentPercentage, getUserContributionAmount } = useData();
  const { user } = useAuth();

  const total = getTotalInvestment();
  const percentage = getUserInvestmentPercentage();
  const userContribution = getUserContributionAmount();

  const adminCards = [
    {
      title: 'Gerenciar Usuários',
      description: 'Ver dados, editar ou excluir usuários',
      path: '/admin-users',
      icon: <span className="text-2xl">👥</span>,
      color: 'bg-red-500'
    }
  ];

  const regularCards = [
    {
      title: 'Registrar Venda',
      description: 'Registrar vendas e estornar',
      path: '/register-sale',
      icon: <span className="text-2xl">🛒</span>,
      color: 'bg-orange-500'
    },
    {
      title: 'Registrar Investimento',
      description: 'Adicionar novos investimentos',
      path: '/investments',
      icon: <span className="text-2xl">🐷</span>,
      color: 'bg-blue-500'
    },
    {
      title: 'Controle de Horas',
      description: 'Registrar horas trabalhadas',
      path: '/time-tracker',
      icon: <span className="text-2xl">🕒</span>,
      color: 'bg-teal-500'
    },
    {
      title: 'Registrar Dívida',
      description: 'Cadastrar novos gastos ou contas mensais',
      path: '/register-debt',
      icon: <span className="text-2xl">💸</span>,
      color: 'bg-yellow-500'
    },
    {
      title: 'Cadastro de Produtos',
      description: 'Gerenciar estoque e preços',
      path: '/register-product',
      icon: <span className="text-2xl">📦</span>,
      color: 'bg-green-500'
    },
    {
      title: 'Visualizar Dados',
      description: 'Gráficos e estatísticas',
      path: '/data',
      icon: <span className="text-2xl">📊</span>,
      color: 'bg-purple-500'
    },
    {
      title: 'Caixa',
      description: 'Ajustar saldo e controlar movimentações',
      path: '/cash-control',
      icon: <span className="text-2xl">💰</span>,
      color: 'bg-indigo-500'
    }
  ];

  const menuItems = user?.isAdmin ? adminCards : regularCards;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Painel Principal" />
      <main className="container mx-auto p-6 space-y-8">
        {/* Boas-vindas */}
        <div className="bg-indigo-600 text-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold">
            Olá, {user?.isAdmin ? 'Administrador' : user?.firstName}!
          </h2>
          <p className="text-sm">
            {user?.isAdmin
              ? 'Gerencie seus investimentos e horas trabalhadas a partir deste painel.'
              : 'Gerencie as Óticas Avila de forma fácil!'}
          </p>
        </div>

        {/* Indicadores (só para não-admin) */}
        {!user?.isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow text-center">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">TOTAL INVESTIDO</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Sua contribuição: R$ {userContribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow text-center">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">SUA PORCENTAGEM</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {percentage.toFixed(1)}%
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Do total investido</p>
            </div>
          </div>
        )}

        {/* Cards de navegação rápida */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-transform transform hover:-translate-y-1"
            >
              <div className={`${item.color} text-white p-3 rounded-lg mb-3`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {item.description}
              </p>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;