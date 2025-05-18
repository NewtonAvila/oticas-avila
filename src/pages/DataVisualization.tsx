import React, { useEffect, useState, useRef } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, Title } from 'chart.js';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { Users, TrendingUp, HelpCircle, Wallet, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, Title);

// Generate colors for the pie chart
const generateColor = (index: number) => {
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)',
  ];
  return colors[index % colors.length];
};

type MonthlySummary = {
  month: string;
  year: number;
  cashBalance: number;
  totalDebts: number;
  dateSaved: string;
};

const DataVisualization: React.FC = () => {
  const { getAllUsersInvestmentData, investments, cashMovements, debts, saveMonthlySummary } = useData();
  const [pieChartData, setPieChartData] = useState({
    labels: [] as string[],
    datasets: [{
      label: 'Investimentos',
      data: [] as number[],
      backgroundColor: [] as string[],
      borderColor: [] as string[],
      borderWidth: 1,
    }]
  });

  const [barChartData, setBarChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[]
  });
  const [groupedBarLabels, setGroupedBarLabels] = useState<{ label: string; year: number; isCurrent: boolean }[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Load monthly summaries from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'monthlySummaries'), snap => {
      const summaries = snap.docs.map(doc => doc.data() as MonthlySummary);
      summaries.sort((a, b) => new Date(`${a.year}-${a.month}-01`).getTime() - new Date(`${b.year}-${b.month}-01`).getTime());
      setMonthlySummaries(summaries);
    }, (error) => {
      console.error('Error fetching monthly summaries:', error);
    });

    return () => unsub();
  }, []);

  // Pie chart for investments
  useEffect(() => {
    const investmentData = getAllUsersInvestmentData();

    const labels = investmentData.map(item => item.name);
    const data = investmentData.map(item => parseFloat(item.amount.toFixed(2)));
    const backgroundColors = investmentData.map((_, index) => generateColor(index));
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

    setPieChartData({
      labels,
      datasets: [{
        label: 'Valor investido',
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      }]
    });
  }, [investments, getAllUsersInvestmentData]);

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${percentage}% (${formatCurrency(value)})`;
          }
        }
      }
    }
  };

  // Bar chart for cash and debts
  useEffect(() => {
    if (!cashMovements.length && !debts.length) {
      setBarChartData({
        labels: [],
        datasets: []
      });
      setGroupedBarLabels([]);
      return;
    }

    // Find all unique months from debts and cashMovements
    const allDates = [
      ...cashMovements.filter(m => m.date).map(m => m.date!.toDate()),
      ...debts.map(d => new Date(d.dueDate))
    ];
    if (!allDates.length) return;

    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const currentDate = new Date('2025-05-18T13:42:00+03:00'); // Current date and time (1:42 PM EEST, May 18, 2025)

    // Generate all months from the earliest date to the current date, including months with debts
    const months: { year: number; month: number }[] = [];
    let current = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    while (current <= currentDate || debts.some(d => new Date(d.dueDate) > current)) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth()
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate cash balance and debts for each month
    const cashData: number[] = [];
    const debtData: number[] = [];
    const labels: string[] = [];
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ].map(name => name.charAt(0).toUpperCase() + name.slice(1)); // Capitalize first letter

    months.forEach(({ year, month }, index) => {
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
      const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth();
      const summary = monthlySummaries.find(s => s.month === monthNames[month] && s.year === year);

      // Use saved summary data if available (for past months), otherwise calculate
      let balance = 0;
      let totalDebt = 0;

      if (summary) {
        // Use saved data for past months
        balance = summary.cashBalance;
        totalDebt = summary.totalDebts;
      } else {
        // Calculate for current month or if no summary exists
        if (isCurrentMonth) {
          const movementsUpToCurrent = cashMovements.filter(m => m.date && m.date.toDate() <= currentDate);
          const totalEntries = movementsUpToCurrent
            .filter(m => m.type === 'entrada')
            .reduce((sum, m) => sum + m.amount, 0);
          const totalExits = movementsUpToCurrent
            .filter(m => m.type === 'saida')
            .reduce((sum, m) => sum + m.amount, 0);
          balance = totalEntries - totalExits;
        } else if (endOfMonth <= currentDate) {
          const movementsUpToMonth = cashMovements.filter(m => m.date && m.date.toDate() <= endOfMonth);
          const totalEntries = movementsUpToMonth
            .filter(m => m.type === 'entrada')
            .reduce((sum, m) => sum + m.amount, 0);
          const totalExits = movementsUpToMonth
            .filter(m => m.type === 'saida')
            .reduce((sum, m) => sum + m.amount, 0);
          balance = totalEntries - totalExits;
        }

        const monthDebts = debts.filter(d => {
          const dueDate = new Date(d.dueDate);
          return dueDate.getFullYear() === year && dueDate.getMonth() === month;
        });
        totalDebt = monthDebts.reduce((sum, d) => sum + d.amount, 0);
      }

      cashData.push(balance);
      debtData.push(totalDebt);
      labels.push(monthNames[month]);

      // Save monthly summary when the month ends
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      if (currentDate.getDate() === lastDayOfMonth && currentDate.getMonth() === month && currentDate.getFullYear() === year) {
        saveMonthlySummary({
          month: monthNames[month],
          year,
          cashBalance: balance,
          totalDebts: totalDebt,
          dateSaved: currentDate.toISOString()
        }).then(() => {
          console.log(`Saved monthly summary for ${monthNames[month]} ${year}: Caixa = ${formatCurrency(balance)}, Dívidas = ${formatCurrency(totalDebt)}`);
        }).catch(err => {
          console.error('Failed to save monthly summary:', err);
        });
      }
    });

    const newGroupedLabels = months.map(({ year, month }) => ({
      label: monthNames[month],
      year,
      isCurrent: year === currentDate.getFullYear() && month === currentDate.getMonth()
    }));

    setBarChartData({
      labels,
      datasets: [
        {
          label: 'Caixa',
          data: cashData,
          backgroundColor: newGroupedLabels.map(item =>
            item.isCurrent ? 'rgba(54, 162, 235, 1)' : 'rgba(54, 162, 235, 0.8)'
          ),
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          barThickness: 20,
          borderRadius: 5,
        },
        {
          label: 'Dívidas',
          data: debtData,
          backgroundColor: newGroupedLabels.map(item =>
            item.isCurrent ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 99, 132, 0.8)'
          ),
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          barThickness: 20,
          borderRadius: 5,
        }
      ]
    });

    setGroupedBarLabels(newGroupedLabels);

    if (chartContainerRef.current) {
      const currentMonthIndex = newGroupedLabels.findIndex(item => item.isCurrent);
      if (currentMonthIndex !== -1) {
        const barWidth = 60;
        const scrollPosition = currentMonthIndex * barWidth;
        chartContainerRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [cashMovements, debts, monthlySummaries, saveMonthlySummary]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatCurrency(value)}`;
          },
          title: function(context: any) {
            const index = context[0].dataIndex;
            const month = barChartData.labels[index];
            const year = groupedBarLabels[index].year;
            return `${month} ${year}`;
          }
        }
      },
      title: {
        display: false,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Valor (R$)'
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const groupByYear = groupedBarLabels.reduce((acc, item, index) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push({ label: item.label, index, isCurrent: item.isCurrent });
    return acc;
  }, {} as Record<number, { label: string; index: number; isCurrent: boolean }[]>);

  const scrollToCurrentMonth = () => {
    if (chartContainerRef.current) {
      const currentMonthIndex = groupedBarLabels.findIndex(item => item.isCurrent);
      if (currentMonthIndex !== -1) {
        const barWidth = 60;
        const scrollPosition = currentMonthIndex * barWidth;
        chartContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900 dark:text-white">
      <Header title="Visualização de Dados" showBackButton />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Pie Chart */}
            <div className="md:col-span-2">
              <div className="card bg-white dark:bg-gray-800">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
                  <Users size={20} className="mr-2" />
                  Distribuição de Investimentos
                </h2>

                {pieChartData.labels.length > 0 ? (
                  <div className="h-80">
                    <Pie data={pieChartData} options={pieChartOptions} />
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">Nenhum dado de investimento encontrado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics and Info */}
            <div className="md:col-span-1">
              <div className="card bg-white dark:bg-gray-800 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                  <TrendingUp size={18} className="mr-2" />
                  Estatísticas
                </h2>

                {pieChartData.labels.length > 0 ? (
                  <div className="space-y-4">
                    {pieChartData.labels.map((label, index) => {
                      const amount = pieChartData.datasets[0].data[index];
                      const total = pieChartData.datasets[0].data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (amount / total) * 100 : 0;

                      return (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: pieChartData.datasets[0].backgroundColor[index] }}
                          ></div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: pieChartData.datasets[0].backgroundColor[index]
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 border-t dark:border-gray-700">
                      <div className="flex justify-between font-medium">
                        <p>Total</p>
                        <p>{formatCurrency(pieChartData.datasets[0].data.reduce((a, b) => a + b, 0))}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">Nenhum investimento registrado.</p>
                )}
              </div>

              <div className="card bg-white dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                  <HelpCircle size={18} className="mr-2" />
                  Sobre o Gráfico
                </h2>

                <div className="text-gray-600 dark:text-gray-400 text-sm space-y-3">
                  <p>O gráfico de pizza representa a participação de cada usuário no total investido.</p>
                  <p>Ele é atualizado automaticamente conforme novos investimentos são adicionados.</p>
                  <p>Passe o mouse sobre as fatias para ver detalhes!</p>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="md:col-span-3">
              <div className="card bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <Wallet size={20} className="mr-2" />
                    Caixa vs Dívidas por Mês
                  </h2>
                  <button
                    onClick={scrollToCurrentMonth}
                    className="btn-primary text-sm px-3 py-1 flex items-center"
                  >
                    <Calendar size={16} className="mr-1" />
                    Ir para o Mês Atual
                  </button>
                </div>

                {barChartData.labels.length > 0 ? (
                  <div className="relative">
                    <div
                      ref={chartContainerRef}
                      className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
                      style={{ maxWidth: '100%' }}
                    >
                      <div style={{ width: `${barChartData.labels.length * 60}px`, minWidth: '100%' }}>
                        <div className="flex">
                          {Object.entries(groupByYear).map(([year, yearMonths]) => (
                            <div key={year} className="flex-1">
                              <div className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {year}
                              </div>
                              <div className="relative h-80">
                                <Bar
                                  data={{
                                    labels: yearMonths.map(m => m.label),
                                    datasets: barChartData.datasets.map(dataset => ({
                                      ...dataset,
                                      data: dataset.data.slice(
                                        yearMonths[0].index,
                                        yearMonths[yearMonths.length - 1].index + 1
                                      )
                                    }))
                                  }}
                                  options={{
                                    ...barChartOptions,
                                    plugins: {
                                      ...barChartOptions.plugins,
                                      tooltip: {
                                        ...barChartOptions.plugins.tooltip,
                                        callbacks: {
                                          ...barChartOptions.plugins.tooltip.callbacks,
                                          title: function(context: any) {
                                            const index = context[0].dataIndex;
                                            return `${yearMonths[index].label} ${year}`;
                                          }
                                        }
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum dado de caixa ou dívidas encontrado.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart Explanation */}
            <div className="md:col-span-3">
              <div className="card bg-white dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                  <HelpCircle size={18} className="mr-2" />
                  Sobre o Gráfico de Caixa vs Dívidas
                </h2>
                <div className="text-gray-600 dark:text-gray-400 text-sm space-y-3">
                  <p>Este gráfico mostra o saldo de caixa (azul) e as dívidas (vermelho) para cada mês.</p>
                  <p>Para meses passados, os valores são obtidos dos resumos mensais salvos, se disponíveis.</p>
                  <p>Para o mês atual, o saldo de caixa é calculado até a data atual, e as dívidas são todas as registradas para o mês.</p>
                  <p>Use a barra de rolagem para navegar pelos meses e o botão para ir ao mês atual.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataVisualization;