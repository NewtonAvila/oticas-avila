import React, { useState } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';

const RegisterDebt: React.FC = () => {
  const { debts, addDebt, updateDebt, deleteDebt, markDebtAsPaid, markDebtAsUnpaid } = useData();
  const { user } = useAuth();

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
      type: 'único', // Apenas gasto único
      userId: user.id,
      userName: user.username
    });

    setDescription('');
    setAmount('');
    setDueDate('');
  };

  const handleEditRow = (id: string, description: string, amount: number, dueDate: string) => {
    setEditDebt({
      id,
      description,
      amount: amount.toString(),
      dueDate,
    });
  };

  const handleSaveRow = async () => {
    if (editDebt) {
      const parsedAmount = parseFloat(editDebt.amount);
      const parsedDueDate = new Date(editDebt.dueDate);
      if (
        !editDebt.description ||
        isNaN(parsedAmount) ||
        parsedAmount <= 0 ||
        !editDebt.dueDate ||
        isNaN(parsedDueDate.getTime())
      ) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente. O valor deve ser maior que 0 e a data deve ser válida.');
        return;
      }
      await updateDebt(editDebt.id, {
        description: editDebt.description,
        amount: parsedAmount,
        dueDate: editDebt.dueDate,
        type: 'único' // Apenas gasto único
      });
      setEditDebt(null);
    }
  };

  const handleCancelRow = () => {
    setEditDebt(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
      await deleteDebt(id);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    await markDebtAsPaid(id);
  };

  const handleMarkAsUnpaid = async (id: string) => {
    await markDebtAsUnpaid(id);
  };

  const isCurrentOrFuture = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date('2025-05-18T13:42:00+03:00'); // Data e hora atuais
    return date >= now;
  };

  const isOverdue = (d: { paid: boolean; dueDate: string }) => {
    const today = new Date('2025-05-18T13:42:00+03:00'); // Data e hora atuais
    const due = new Date(d.dueDate);
    return !d.paid && due < today;
  };

  // Filtrar dívidas que são atuais ou futuras
  const currentOrFutureDebts = debts.filter(d => isCurrentOrFuture(d.dueDate));

  // Agrupar dívidas por mês e ano
  const groupDebtsByMonth = (debtsList: typeof debts) => {
    const grouped: { [key: string]: typeof debts } = {};
    debtsList.forEach(debt => {
      const date = new Date(debt.dueDate);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // Ex.: "Maio 2025"
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(debt);
    });
    // Ordenar os meses cronologicamente
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
    return { grouped, sortedKeys };
  };

  const unpaidDebts = currentOrFutureDebts.filter(d => !d.paid);
  const paidDebts = currentOrFutureDebts.filter(d => d.paid);

  const { grouped: unpaidGrouped, sortedKeys: unpaidSortedKeys } = groupDebtsByMonth(unpaidDebts);
  const { grouped: paidGrouped, sortedKeys: paidSortedKeys } = groupDebtsByMonth(paidDebts);

  const getTotal = (ds: typeof debts) =>
    ds.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Registrar Dívida" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Suas Dívidas</h2>

          {/* Pendentes */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Pendentes: {formatCurrency(getTotal(unpaidDebts))}</h3>
              <button onClick={() => setShowUnpaid(!showUnpaid)} className="text-sm text-blue-600 underline">
                {showUnpaid ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showUnpaid && unpaidSortedKeys.map(monthYear => (
              <div key={monthYear} className="mt-4">
                <h4 className="font-semibold text-md mb-2">{monthYear} - {formatCurrency(getTotal(unpaidGrouped[monthYear]))}</h4>
                {unpaidGrouped[monthYear].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(d => {
                  const isEditing = editDebt?.id === d.id;
                  return (
                    <div key={d.id} className={`mt-2 p-3 rounded border ${isOverdue(d) ? 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900' : 'bg-blue-50 dark:bg-blue-100 dark:text-gray-900'}`}>
                      <div className="flex justify-between">
                        <div>
                          {isEditing && editDebt ? (
                            <>
                              <input
                                type="text"
                                value={editDebt.description}
                                onChange={(e) => setEditDebt({ ...editDebt, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                placeholder="Descrição"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editDebt.amount}
                                onChange={(e) => setEditDebt({ ...editDebt, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                placeholder="Valor (R$)"
                              />
                              <input
                                type="date"
                                value={editDebt.dueDate}
                                onChange={(e) => setEditDebt({ ...editDebt, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
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
                              <p className="font-semibold">{formatCurrency(d.amount)}</p>
                              <button onClick={() => handleMarkAsPaid(d.id)} className="text-sm text-blue-600 underline">
                                ✅ Marcar como pago
                              </button>
                              <button
                                onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(d.id)}
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
            ))}
          </div>

          {/* Pagas */}
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Pagas: {formatCurrency(getTotal(paidDebts))}</h3>
              <button onClick={() => setShowPaid(!showPaid)} className="text-sm text-blue-600 underline">
                {showPaid ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showPaid && paidSortedKeys.map(monthYear => (
              <div key={monthYear} className="mt-4">
                <h4 className="font-semibold text-md mb-2">{monthYear} - {formatCurrency(getTotal(paidGrouped[monthYear]))}</h4>
                {paidGrouped[monthYear].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(d => {
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
                                onChange={(e) => setEditDebt({ ...editDebt, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                placeholder="Descrição"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editDebt.amount}
                                onChange={(e) => setEditDebt({ ...editDebt, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                                placeholder="Valor (R$)"
                              />
                              <input
                                type="date"
                                value={editDebt.dueDate}
                                onChange={(e) => setEditDebt({ ...editDebt, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
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
                              <p className="font-semibold">{formatCurrency(d.amount)}</p>
                              <button onClick={() => handleMarkAsUnpaid(d.id)} className="text-sm text-blue-600 underline">
                                ⛔ Marcar como não pago
                              </button>
                              <button
                                onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(d.id)}
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
            ))}
          </div>
        </section>

        {/* Formulário */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Nova Dívida</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} required />
            <input type="number" step="0.01" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" placeholder="Valor (R$)" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input type="date" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Registrar</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterDebt;