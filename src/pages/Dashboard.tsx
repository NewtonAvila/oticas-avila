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

  const adminCard = [
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
      title: 'Visualizar Dados',
      description: 'Gráficos e estatísticas',
      path: '/data',
      icon: <span className="text-2xl">📊</span>,
      color: 'bg-purple-500'
    }
  ];

  const menuItems = user?.isAdmin ? adminCard : regularCards;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Painel Principal" />
      <main className="container mx-auto p-6 space-y-8">
        <div className="bg-indigo-600 text-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold">
            Olá, {user?.isAdmin ? 'Administrador' : `${user?.firstName}`}!
          </h2>
          <p className="text-sm">
            {user?.isAdmin
              ? 'Gerencie seus investimentos e horas trabalhadas a partir deste painel.'
              : 'Gerencie seus investimentos e sessões de tempo de forma fácil.'}
          </p>
        </div>

        {!user?.isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow text-center">
              <h3 className="text-sm text-gray-500">TOTAL INVESTIDO</h3>
              <p className="text-3xl font-bold text-gray-800">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-gray-500 text-sm">
                Sua contribuição: R$ {userContribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <h3 className="text-sm text-gray-500">SUA PORCENTAGEM</h3>
              <p className="text-3xl font-bold text-gray-800">
                {percentage.toFixed(1)}%
              </p>
              <p className="text-gray-500 text-sm">Do total investido</p>
            </div>
          </div>
        )}

        {/* Navegação rápida */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="card h-48 flex flex-col items-center justify-center text-center hover:shadow-lg cursor-pointer transform transition-all duration-300 hover:-translate-y-1 bg-white rounded"
            >
              <div className={`${item.color} text-white p-3 rounded-lg mb-4`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.description}</p>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
