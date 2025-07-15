import React, { useState } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Definindo a interface para uma dívida
interface Debt {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  userId: string;
  userName: string;
}

const RegisterDebt: React.FC = () => {
  const { debts, addDebt, updateDebt, deleteDebt, markDebtAsPaid, markDebtAsUnpaid } = useData();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showPaid, setShowPaid] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(true);
  const [editDebt, setEditDebt] = useState<{
    id: string;
    description: string;
    amount: string;
    dueDate: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description || !amount || !dueDate) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    await addDebt({
      description,
      amount: parsedAmount,
      dueDate,
      paid: false,
      userId: user.id,
      userName: user.username
    });

    setDescription('');
    setAmount('');
    setDueDate('');
  };

  const handleEditRow = (id: string, description: string, amount: number, dueDate: string) => {
    setEditDebt({ id, description, amount: amount.toString(), dueDate });
  };

  const handleSaveRow = async () => {
    if (editDebt) {
      const parsedAmount = parseFloat(editDebt.amount);
      const parsedDueDate = new Date(editDebt.dueDate);
      if (!editDebt.description || isNaN(parsedAmount) || parsedAmount <= 0 || !editDebt.dueDate || isNaN(parsedDueDate.getTime())) {
        alert('Please fill all required fields correctly.');
        return;
      }
      await updateDebt(editDebt.id, {
        description: editDebt.description,
        amount: parsedAmount,
        dueDate: editDebt.dueDate,
      });
      setEditDebt(null);
    }
  };

  const handleCancelRow = () => {
    setEditDebt(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this debt?')) {
      await deleteDebt(id);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    await markDebtAsPaid(id);
  };

  const handleMarkAsUnpaid = async (id: string) => {
    await markDebtAsUnpaid(id);
  };

  const isOverdue = (d: Debt) => {
    const today = new Date();
    const due = new Date(d.dueDate);
    return !d.paid && due < today;
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' });
  };

  // Agrupar dívidas por mês e ano com tipagem explícita e calcular total
  const groupDebtsByMonth = (debtsList: Debt[]) => {
    const grouped: { [key: string]: Debt[] } = {};
    debtsList.forEach(d => {
      const monthYear = getMonthYear(d.dueDate);
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(d);
    });
    return Object.entries(grouped).map(([month, debts]) => ({
      month,
      debts,
      total: debts.reduce((acc, cur) => acc + (cur.amount || 0), 0)
    }));
  };

  const currentOrFutureDebts = (debts as Debt[]).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const unpaidDebts = groupDebtsByMonth(currentOrFutureDebts.filter(d => !d.paid));
  const paidDebts = groupDebtsByMonth(currentOrFutureDebts.filter(d => d.paid));

  const getTotal = (ds: Debt[]) =>
    ds.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Register Debt" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Your Debts</h2>
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Unpaid: {formatCurrency(getTotal(currentOrFutureDebts.filter(d => !d.paid)), 'EUR')}</h3>
              <button onClick={() => setShowUnpaid(!showUnpaid)} className="text-sm text-blue-600 underline">
                {showUnpaid ? 'Hide' : 'Show'}
              </button>
            </div>
            {showUnpaid && unpaidDebts.map(({ month, debts, total }) => (
              <div key={month}>
                <h3 className="text-md font-medium mt-4 mb-2">{month} - Total: {formatCurrency(total, 'EUR')}</h3>
                {debts.map(d => {
                  const isEditing = editDebt?.id === d.id;
                  return (
                    <div key={d.id} className={`mt-2 p-3 rounded border ${isOverdue(d) ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-gray-900'}`}>
                      <div className="flex justify-between">
                        <div>
                          {isEditing && editDebt ? (
                            <>
                              <input
                                type="text"
                                value={editDebt.description}
                                onChange={e => setEditDebt({ ...editDebt, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Description"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editDebt.amount}
                                onChange={e => setEditDebt({ ...editDebt, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Amount (€)"
                              />
                              <input
                                type="date"
                                value={editDebt.dueDate}
                                onChange={e => setEditDebt({ ...editDebt, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                              />
                            </>
                          ) : (
                            <>
                              <p className="font-medium">{d.description}</p>
                              <p className="text-sm">{new Date(d.dueDate).toLocaleDateString()}</p>
                            </>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {!isEditing && (
                            <>
                              <p className="font-semibold">{formatCurrency(d.amount, 'EUR')}</p>
                              <button onClick={() => handleMarkAsPaid(d.id)} className="text-sm text-blue-600 underline">
                                Mark as paid
                              </button>
                              <button onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate)} className="text-blue-600 hover:text-blue-800">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-800">
                                <Trash size={16} />
                              </button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <button onClick={handleSaveRow} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Save</button>
                              <button onClick={handleCancelRow} className="bg-gray-500 text-white px-2 py-1 rounded text-sm">Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Paid: {formatCurrency(getTotal(currentOrFutureDebts.filter(d => d.paid)), 'EUR')}</h3>
              <button onClick={() => setShowPaid(!showPaid)} className="text-sm text-blue-600 underline">
                {showPaid ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPaid && paidDebts.map(({ month, debts, total }) => (
              <div key={month}>
                <h3 className="text-md font-medium mt-4 mb-2">{month} - Total: {formatCurrency(total, 'EUR')}</h3>
                {debts.map(d => {
                  const isEditing = editDebt?.id === d.id;
                  return (
                    <div key={d.id} className="mt-2 p-3 rounded border bg-gray-200 text-gray-500">
                      <div className="flex justify-between">
                        <div>
                          {isEditing && editDebt ? (
                            <>
                              <input
                                type="text"
                                value={editDebt.description}
                                onChange={e => setEditDebt({ ...editDebt, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Description"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editDebt.amount}
                                onChange={e => setEditDebt({ ...editDebt, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Amount (€)"
                              />
                              <input
                                type="date"
                                value={editDebt.dueDate}
                                onChange={e => setEditDebt({ ...editDebt, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                              />
                            </>
                          ) : (
                            <>
                              <p className="font-medium">{d.description}</p>
                              <p className="text-sm">{new Date(d.dueDate).toLocaleDateString()}</p>
                            </>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {!isEditing && (
                            <>
                              <p className="font-semibold">{formatCurrency(d.amount, 'EUR')}</p>
                              <button onClick={() => handleMarkAsUnpaid(d.id)} className="text-sm text-blue-600 underline">
                                Mark as unpaid
                              </button>
                              <button onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate)} className="text-blue-600 hover:text-blue-800">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-800">
                                <Trash size={16} />
                              </button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <button onClick={handleSaveRow} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Save</button>
                              <button onClick={handleCancelRow} className="bg-gray-500 text-white px-2 py-1 rounded text-sm">Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">New Debt</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              placeholder="Amount (€)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            <input
              type="date"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Register</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterDebt;