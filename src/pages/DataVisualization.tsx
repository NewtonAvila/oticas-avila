import React, { useEffect, useState, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

// Register ChartJS components
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface UnplannedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  userId: string;
  userName: string;
}

interface Entry {
  id: string;
  amount: number;
  date: string;
  description: string;
  userId: string;
}

const DataVisualization: React.FC = () => {
  const { debts } = useData();
  const { user } = useAuth();
  const [unplannedExpenses, setUnplannedExpenses] = useState<UnplannedExpense[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [barChartData, setBarChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[]
  });
  const [cashBalance, setCashBalance] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date(); // Data atual (13/07/2025)

  // Carregar gastos não planejados do Firestore
  useEffect(() => {
    if (!user) {
      console.log("Usuário não autenticado, saindo do useEffect.");
      return;
    }

    const unsubUnplanned = onSnapshot(collection(db, 'unplannedExpenses'), (snap: QuerySnapshot<DocumentData>) => {
      const expenses = snap.docs
        .map((doc: DocumentData) => ({
          id: doc.id,
          ...doc.data() as Omit<UnplannedExpense, 'id'>
        }))
        .filter((e): e is UnplannedExpense => !!e.id && !!e.description && !isNaN(e.amount));
      console.log("Gastos não planejados carregados:", expenses);
      setUnplannedExpenses(expenses);
    }, (error) => {
      console.error("Erro ao carregar gastos não planejados:", error);
    });

    return () => unsubUnplanned();
  }, [user]);

  // Carregar entradas do Firestore
  useEffect(() => {
    if (!user) {
      console.log("Usuário não autenticado, saindo do useEffect.");
      return;
    }

    const unsubEntries = onSnapshot(collection(db, 'entries'), (snap: QuerySnapshot<DocumentData>) => {
      const entriesData = snap.docs
        .map((doc: DocumentData) => ({
          id: doc.id,
          ...doc.data() as Omit<Entry, 'id'>
        }))
        .filter((e): e is Entry => !!e.id && !!e.description && !isNaN(e.amount));
      console.log("Entradas carregadas:", entriesData);
      setEntries(entriesData);
    }, (error) => {
      console.error("Erro ao carregar entradas:", error);
    });

    return () => unsubEntries();
  }, [user]);

  // Calcular saldo em caixa (entradas - saídas - dívidas pagas)
  useEffect(() => {
    const totalEntries = entries.reduce((sum, e) => {
      const entryDate = new Date(e.date);
      return entryDate <= today && entryDate.getTime() > 0 ? sum + e.amount : sum;
    }, 0);

    const totalExits = unplannedExpenses.reduce((sum, e) => {
      const exitDate = new Date(e.date);
      return exitDate <= today && exitDate.getTime() > 0 ? sum + e.amount : sum;
    }, 0);

    const totalPaidDebts = debts
      .filter(d => d.paid && d.dueDate && new Date(d.dueDate) <= today)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const balance = totalEntries - (totalExits + totalPaidDebts);
    setCashBalance(balance);
  }, [entries, unplannedExpenses, debts]);

  useEffect(() => {
    // Encontrar todos os meses com dívidas, gastos ou entradas
    const allDates = [
      ...unplannedExpenses.map(e => new Date(e.date)),
      ...debts.map(d => new Date(d.dueDate)),
      ...entries.map(e => new Date(e.date))
    ].filter(date => date.getTime() > 0);

    if (!allDates.length) {
      console.log("Nenhum dado disponível para o gráfico.");
      setBarChartData({ labels: [], datasets: [] });
      return;
    }

    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const months: { year: number; month: number; label: string }[] = [];
    let current = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ].map(name => name.charAt(0).toUpperCase() + name.slice(1));

    while (current <= today || debts.some(d => new Date(d.dueDate) > current) || unplannedExpenses.some(e => new Date(e.date) > current) || entries.some(e => new Date(e.date) > current)) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        label: `${monthNames[current.getMonth()]} ${current.getFullYear()}`
      });
      current.setMonth(current.getMonth() + 1);
    }

    const entryData = months.map(({ year, month }) => {
      return entries.filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month)
        .reduce((sum, e) => sum + e.amount, 0);
    });

    const exitData = months.map(({ year, month }) => {
      const paidDebtsThisMonth = debts.filter(d => d.paid && d.dueDate && new Date(d.dueDate).getFullYear() === year && new Date(d.dueDate).getMonth() === month);
      const unplannedExpensesThisMonth = unplannedExpenses.filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month);
      const totalPaidDebts = paidDebtsThisMonth.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalUnplannedExpenses = unplannedExpensesThisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
      return totalPaidDebts + totalUnplannedExpenses;
    });

    const debtData = months.map(({ year, month }) => {
      return debts.filter(d => {
        if (!d.dueDate) return false;
        const dueDate = new Date(d.dueDate);
        return dueDate.getFullYear() === year && dueDate.getMonth() === month && !d.paid;
      }).reduce((sum, d) => sum + d.amount, 0);
    });

    console.log("Dados do gráfico:", { labels: months.map(m => m.label), entryData, exitData, debtData });
    setBarChartData({
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Entradas',
          data: entryData,
          backgroundColor: months.map(m => m.year === today.getFullYear() && m.month === today.getMonth() ? 'rgba(75, 192, 192, 1)' : 'rgba(75, 192, 192, 0.8)'),
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          barThickness: 20,
          borderRadius: 5,
        },
        {
          label: 'Saídas (Dívidas Pagas + Gastos Não Planejados)',
          data: exitData,
          backgroundColor: months.map(m => m.year === today.getFullYear() && m.month === today.getMonth() ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 99, 132, 0.8)'),
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          barThickness: 20,
          borderRadius: 5,
        },
        {
          label: 'Dívidas Pendentes',
          data: debtData,
          backgroundColor: months.map(m => m.year === today.getFullYear() && m.month === today.getMonth() ? 'rgba(255, 205, 86, 1)' : 'rgba(255, 205, 86, 0.8)'),
          borderColor: 'rgba(255, 205, 86, 1)',
          borderWidth: 1,
          barThickness: 20,
          borderRadius: 5,
        },
      ],
    });

    // Rola para o mês atual
    if (chartContainerRef.current) {
      const currentMonthIndex = months.findIndex(m => m.year === today.getFullYear() && m.month === today.getMonth());
      if (currentMonthIndex !== -1) {
        const barWidth = 60;
        const scrollPosition = currentMonthIndex * barWidth;
        chartContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, [debts, unplannedExpenses, entries]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
          title: (context: any) => context[0].label,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Valor (R$)' },
        ticks: { callback: (value: any) => formatCurrency(value) },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900 dark:text-white">
      <Header title="Visualização de Dados" showBackButton />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="card bg-white dark:bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Visualização de Dados</h2>
            {/* Seção de Saldo em Caixa */}
            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 rounded-lg text-center">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Saldo em Caixa</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                {formatCurrency(cashBalance)}
              </p>
            </div>
            {/* Gráfico */}
            {barChartData.labels.length > 0 ? (
              <div ref={chartContainerRef} className="h-80 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nenhum dado disponível.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataVisualization;