import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { PenSquare, DollarSign, Edit, Trash } from 'lucide-react';

const InvestmentForm: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', isError: false });
  const [editInvestment, setEditInvestment] = useState<{ id: string; description: string; amount: string } | null>(null);

  const { user } = useAuth();
  const {
    investments,
    addInvestment,
    updateInvestment,
    getTotalInvestment,
    getUserInvestmentPercentage,
    deleteInvestment,
  } = useData();

  useEffect(() => {
    // Não limitar a 5 investimentos, apenas filtrar pelo userId
    if (user) {
      const userInvestments = investments.filter(inv => inv.userId === user.id);
      // Ordenar por data decrescente (mais recentes primeiro)
      userInvestments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [investments, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', isError: false });

    try {
      const amountValue = parseFloat(amount.replace(',', '.')); // Handle Brazilian locale (e.g., "700,00" to 700.00)

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

  const handleEditRow = (id: string, description: string, amount: number) => {
    setEditInvestment({ id, description, amount: amount.toString() });
  };

  const handleSaveRow = () => {
    if (editInvestment) {
      const amountValue = parseFloat(editInvestment.amount.replace(',', '.')); // Handle Brazilian locale
      if (!editInvestment.description.trim()) {
        alert('Por favor, insira uma descrição.');
        return;
      }
      if (isNaN(amountValue) || amountValue <= 0) {
        alert('Insira um valor válido.');
        return;
      }
      updateInvestment(editInvestment.id, {
        description: editInvestment.description,
        amount: amountValue,
      });
      setEditInvestment(null);
    }
  };

  const handleCancelRow = () => {
    setEditInvestment(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      deleteInvestment(id);
    }
  };

  // Agrupar investimentos por mês e ano
  const groupInvestmentsByMonth = (investmentsList: typeof investments) => {
    const grouped: { [key: string]: typeof investments } = {};
    investmentsList.forEach(inv => {
      const date = new Date(inv.date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // Ex.: "Maio 2025"
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(inv);
    });
    // Ordenar os meses cronologicamente
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
    return { grouped, sortedKeys };
  };

  const userInvestments = user ? investments.filter(inv => inv.userId === user.id) : [];
  const { grouped, sortedKeys } = groupInvestmentsByMonth(userInvestments);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header title="Registrar Investimento" showBackButton />
      <main className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-5 gap-10">
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
              <h2 className="text-lg font-semibold mb-4">Seus Investimentos</h2>
              {userInvestments.length > 0 ? (
                sortedKeys.map(monthYear => (
                  <div key={monthYear} className="mt-4">
                    <h4 className="font-semibold text-md mb-2">{monthYear}</h4>
                    {grouped[monthYear].map(inv => {
                      const isEditing = editInvestment?.id === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="mt-2 p-3 rounded border bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                        >
                          <div className="flex justify-between">
                            <div>
                              {isEditing && editInvestment ? (
                                <>
                                  <input
                                    type="text"
                                    value={editInvestment.description}
                                    onChange={(e) =>
                                      setEditInvestment({ ...editInvestment, description: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                    placeholder="Descrição"
                                  />
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={editInvestment.amount}
                                    onChange={(e) =>
                                      setEditInvestment({ ...editInvestment, amount: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                    placeholder="0,00"
                                  />
                                </>
                              ) : (
                                <>
                                  <p className="font-medium">{inv.description}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-300">
                                    {new Date(inv.date).toLocaleDateString('pt-BR')}
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-2">
                              {!isEditing && (
                                <>
                                  <p className="font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(inv.amount)}
                                  </p>
                                  <button
                                    onClick={() => handleEditRow(inv.id, inv.description, inv.amount)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(inv.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </>
                              )}
                              {isEditing && (
                                <>
                                  <button
                                    onClick={handleSaveRow}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={handleCancelRow}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-300 text-sm italic">Nenhum investimento registrado.</p>
              )}
            </div>
          </div>
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