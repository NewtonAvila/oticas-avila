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
  const [type, setType] = useState<'único' | 'fixo'>('único');
  const [duration, setDuration] = useState('');

  const [showPaid, setShowPaid] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(true);
  const [editDebt, setEditDebt] = useState<{
    id: string;
    description: string;
    amount: string;
    dueDate: string;
    type: 'único' | 'fixo';
    duration: string;
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
      type,
      ...(type === 'fixo' && duration ? { duration: parseInt(duration) } : {}),
      userId: user.id,
      userName: user.username
    });

    setDescription('');
    setAmount('');
    setDueDate('');
    setType('único');
    setDuration('');
  };

  const handleEditRow = (id: string, description: string, amount: number, dueDate: string, type: 'único' | 'fixo', duration?: number) => {
    setEditDebt({
      id,
      description,
      amount: amount.toString(),
      dueDate,
      type,
      duration: duration ? duration.toString() : ''
    });
  };

  const handleSaveRow = async () => {
    if (editDebt) {
      const parsedAmount = parseFloat(editDebt.amount);
      if (!editDebt.description || isNaN(parsedAmount) || !editDebt.dueDate) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
      }
      await updateDebt(editDebt.id, {
        description: editDebt.description,
        amount: parsedAmount,
        dueDate: editDebt.dueDate,
        type: editDebt.type,
        ...(editDebt.type === 'fixo' && editDebt.duration ? { duration: parseInt(editDebt.duration) } : { duration: undefined })
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

  const isCurrentMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const isOverdue = (d: any) => {
    const today = new Date();
    const due = new Date(d.dueDate);
    return !d.paid && due < today;
  };

  const currentMonthDebts = debts.filter(d => isCurrentMonth(d.dueDate));
  const unpaidDebts = currentMonthDebts.filter(d => !d.paid);
  const paidDebts = currentMonthDebts.filter(d => d.paid);

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
            {showUnpaid && unpaidDebts.map(d => {
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
                          <select
                            value={editDebt.type}
                            onChange={(e) => setEditDebt({ ...editDebt, type: e.target.value as 'único' | 'fixo' })}
                            className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                          >
                            <option value="único">Gasto único</option>
                            <option value="fixo">Gasto fixo</option>
                          </select>
                          {editDebt.type === 'fixo' && (
                            <input
                              type="number"
                              value={editDebt.duration}
                              onChange={(e) => setEditDebt({ ...editDebt, duration: e.target.value })}
                              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                              placeholder="Duração (meses)"
                            />
                          )}
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
                            onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate, d.type, d.duration)}
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

          {/* Pagas */}
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Pagas: {formatCurrency(getTotal(paidDebts))}</h3>
              <button onClick={() => setShowPaid(!showPaid)} className="text-sm text-blue-600 underline">
                {showPaid ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showPaid && paidDebts.map(d => {
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
                          <select
                            value={editDebt.type}
                            onChange={(e) => setEditDebt({ ...editDebt, type: e.target.value as 'único' | 'fixo' })}
                            className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                          >
                            <option value="único">Gasto único</option>
                            <option value="fixo">Gasto fixo</option>
                          </select>
                          {editDebt.type === 'fixo' && (
                            <input
                              type="number"
                              value={editDebt.duration}
                              onChange={(e) => setEditDebt({ ...editDebt, duration: e.target.value })}
                              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700 mb-2"
                              placeholder="Duração (meses)"
                            />
                          )}
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
                            onClick={() => handleEditRow(d.id, d.description, d.amount, d.dueDate, d.type, d.duration)}
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
        </section>

        {/* Formulário */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Nova Dívida</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} required />
            <input type="number" step="0.01" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" placeholder="Valor (R$)" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input type="date" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            <select className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" value={type} onChange={e => setType(e.target.value as 'único' | 'fixo')}>
              <option value="único">Gasto único</option>
              <option value="fixo">Gasto fixo</option>
            </select>
            {type === 'fixo' && (
              <input type="number" placeholder="Duração (meses)" className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700" value={duration} onChange={e => setDuration(e.target.value)} />
            )}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Registrar</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterDebt;