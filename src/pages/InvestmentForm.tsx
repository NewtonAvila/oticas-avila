import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { PenSquare, DollarSign } from 'lucide-react';

const InvestmentForm: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', isError: false });
  const [recentInvestments, setRecentInvestments] = useState<any[]>([]);

  const { user } = useAuth();
  const {
    investments,
    addInvestment,
    getTotalInvestment,
    getUserInvestmentPercentage,
    deleteInvestment,
  } = useData();

  useEffect(() => {
    if (user) {
      const userInvestments = investments
        .filter(inv => inv.userId === user.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentInvestments(userInvestments);
    }
  }, [investments, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', isError: false });

    try {
      const amountValue = parseFloat(amount);

      if (!description.trim()) {
        setFeedback({ message: 'Por favor, insira uma descrição.', isError: true });
        return;
      }

      if (isNaN(amountValue) || amountValue <= 0) {
        setFeedback({ message: 'Insira um valor válido.', isError: true });
        return;
      }

      addInvestment(description, amountValue);
      setDescription('');
      setAmount('');
      setFeedback({ message: 'Investimento registrado com sucesso!', isError: false });
      setTimeout(() => setFeedback({ message: '', isError: false }), 3000);
    } catch {
      setFeedback({ message: 'Erro ao registrar o investimento.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      deleteInvestment(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header title="Registrar Investimento" showBackButton />
      <main className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-5 gap-10">
          {/* Estatísticas */}
          <div className="md:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Seus Dados</h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Investido</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(getTotalInvestment())}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sua Participação</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 relative">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full absolute top-0 left-0 transition-all duration-300"
                      style={{ width: `${getUserInvestmentPercentage()}%` }}
                    />
                  </div>
                  <p className="text-sm text-right mt-1 text-gray-600 dark:text-gray-300">
                    {getUserInvestmentPercentage().toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Seus Últimos Investimentos</h2>

              {recentInvestments.length > 0 ? (
                <ul className="space-y-4">
                  {recentInvestments.map(inv => (
                    <li
                      key={inv.id}
                      className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{inv.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          {new Date(inv.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(inv.amount)}
                        </p>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-xs text-red-500 hover:underline mt-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-300 text-sm italic">Nenhum investimento registrado.</p>
              )}
            </div>
          </div>

          {/* Formulário */}
          <div className="md:col-span-3">
            <div className="card">
              <h2 className="text-xl font-bold mb-6">Novo Investimento</h2>

              {feedback.message && (
                <div
                  className={`mb-6 px-4 py-3 rounded-md text-sm font-medium ${
                    feedback.isError
                      ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-200 dark:text-red-800'
                      : 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-200 dark:text-green-800'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="description" className="label">
                    Descrição do Investimento
                  </label>
                  <div className="relative">
                    <PenSquare
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Ex: Compra de equipamentos"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="amount" className="label">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-field pl-10"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  Registrar Investimento
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvestmentForm;
