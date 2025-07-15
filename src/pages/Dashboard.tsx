import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { formatCurrency } from '../utils/format';
import { Debt, Entry } from '../contexts/DataContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { entries = [], debts = [], unplannedExpenses = [] } = useData() || {};
  const { user } = useAuth();
  const today = new Date();

  // 1) Total recebido até hoje (somente entradas)
  const totalReceived = entries
    .filter((e: Entry) => new Date(e.date) <= today)
    .reduce((sum, e) => sum + e.amount, 0);

  // 2) Total de dívidas pagas até hoje
  const paidDebtsTotal = debts
    .filter(d => d.paid && d.dueDate && (new Date(d.dueDate).getTime() || new Date(0).getTime()) <= today.getTime())
    .reduce((sum, d) => sum + d.amount, 0);
  console.log("paidDebtsTotal Debug:", debts.filter(d => d.paid && d.dueDate && (new Date(d.dueDate).getTime() || new Date(0).getTime()) <= today.getTime()).map(d => ({ id: d.id, amount: d.amount, dueDate: d.dueDate, paid: d.paid })));

  // 3) Total de gastos não planejados até hoje
  const unplannedExpensesTotal = unplannedExpenses
    .filter(e => new Date(e.date) <= today)
    .reduce((sum, e) => sum + e.amount, 0);

  // 4) Saldo em caixa
  const cashBalance = totalReceived - paidDebtsTotal - unplannedExpensesTotal;
  console.log("totalReceived:", totalReceived, "paidDebtsTotal:", paidDebtsTotal, "unplannedExpensesTotal:", unplannedExpensesTotal, "cashBalance:", cashBalance);

  // Mês e ano atuais
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 5) Entradas do mês
  const totalEntries = entries
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // 6) Gastos não planejados do mês
  const totalExits = unplannedExpenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // 7) Dívidas pendentes do mês
  const monthlyDebts = debts
    .filter(d => {
      if (!d.dueDate) return false;
      const dDate = new Date(d.dueDate);
      return dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth && !d.paid;
    })
    .reduce((sum, d) => sum + d.amount, 0);

  // 9) Dívidas pagas no mês
  const paidDebtsThisMonth = debts
    .filter(d => {
      if (!d.dueDate) return false;
      const dDate = new Date(d.dueDate);
      return dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth && d.paid;
    })
    .reduce((sum, d) => sum + d.amount, 0);

  // 8) Saldo do mês = entradas - (saídas + dívidas pendentes + dívidas pagas no mês)
  const monthlyBalance = totalEntries - (totalExits + monthlyDebts + paidDebtsThisMonth);
  console.log("totalEntries:", totalEntries, "totalExits:", totalExits, "monthlyDebts:", monthlyDebts, "paidDebtsThisMonth:", paidDebtsThisMonth, "monthlyBalance:", monthlyBalance);

  const menuItems = [
    { title: 'Registrar Dívida', path: '/register-debt', icon: '💸', color: 'bg-yellow-500' },
    { title: 'Registrar Entrada', path: '/register-entry', icon: '💰', color: 'bg-green-500' },
    { title: 'Gastos não Planejados', path: '/unplanned-expenses', icon: '💳', color: 'bg-red-500' },
    { title: 'Visualização de Dados', path: '/data-visualization', icon: '📈', color: 'bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Painel Principal" />
      <main className="container mx-auto p-6 space-y-8">
        <div className="bg-indigo-600 text-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold">Olá, {user?.firstName || 'Usuário'}!</h2>
          <p className="text-sm">Gerencie suas finanças de forma fácil!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow text-center">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">SALDO EM CAIXA</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{formatCurrency(cashBalance, 'EUR')}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Dinheiro disponível no momento</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow text-center">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">DÍVIDAS PENDENTES</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{formatCurrency(monthlyDebts, 'EUR')}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total não pago no mês</p>
          </div>
        </div>

        <div className={monthlyBalance >= 0 ? 'bg-green-100 dark:bg-green-900 p-6 rounded-lg shadow-lg border-2 border-green-400 text-center' : 'bg-red-100 dark:bg-red-900 p-6 rounded-lg shadow-lg border-2 border-red-400 text-center'}>
          <h3 className="text-lg text-gray-700 dark:text-gray-200 font-semibold">SALDO DO MÊS</h3>
          <p className="text-4xl font-bold text-gray-800 dark:text-white">{formatCurrency(monthlyBalance, 'EUR')}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Entradas e saídas do mês</p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-transform transform hover:-translate-y-1"
            >
              <div className={`${item.color} text-white p-3 rounded-lg mb-3`}>
                {item.icon}
              </div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{item.title}</div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;