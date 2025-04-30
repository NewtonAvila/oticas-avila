import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { Users, TrendingUp, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../utils/format';

// Registrando os componentes do ChartJS
ChartJS.register(ArcElement, Tooltip, Legend);

// Gera cores automáticas para o gráfico
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

const DataVisualization: React.FC = () => {
  const { getAllUsersInvestmentData, investments } = useData();
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [{
      label: 'Investimentos',
      data: [] as number[],
      backgroundColor: [] as string[],
      borderColor: [] as string[],
      borderWidth: 1,
    }]
  });

  useEffect(() => {
    const investmentData = getAllUsersInvestmentData();

    const labels = investmentData.map(item => item.name);
    const data = investmentData.map(item => parseFloat(item.amount.toFixed(2)));
    const backgroundColors = investmentData.map((_, index) => generateColor(index));
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

    setChartData({
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

  const chartOptions = {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Visualização de Dados" showBackButton />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Gráfico */}
            <div className="md:col-span-2">
              <div className="card bg-white">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <Users size={20} className="mr-2" />
                  Distribuição de Investimentos
                </h2>

                {chartData.labels.length > 0 ? (
                  <div className="h-80">
                    <Pie data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">Nenhum dado de investimento encontrado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="md:col-span-1">

              {/* Investimento por usuário */}
              <div className="card bg-white mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <TrendingUp size={18} className="mr-2" />
                  Estatísticas
                </h2>

                {chartData.labels.length > 0 ? (
                  <div className="space-y-4">
                    {chartData.labels.map((label, index) => {
                      const amount = chartData.datasets[0].data[index];
                      const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (amount / total) * 100 : 0;

                      return (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }}
                          ></div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: chartData.datasets[0].backgroundColor[index]
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <p>Total</p>
                        <p>{formatCurrency(chartData.datasets[0].data.reduce((a, b) => a + b, 0))}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Nenhum investimento registrado.</p>
                )}
              </div>

              {/* Explicação do gráfico */}
              <div className="card bg-white">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <HelpCircle size={18} className="mr-2" />
                  Sobre o Gráfico
                </h2>

                <div className="text-gray-600 text-sm space-y-3">
                  <p>O gráfico de pizza representa a participação de cada usuário no total investido.</p>
                  <p>Ele é atualizado automaticamente conforme novos investimentos são adicionados.</p>
                  <p>Passe o mouse sobre as fatias para ver detalhes!</p>
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
