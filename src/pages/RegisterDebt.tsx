import React, { useState } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';

const RegisterDebt: React.FC = () => {
  const { debts, addDebt, markDebtAsPaid, markDebtAsUnpaid } = useData();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'único' | 'fixo'>('único');
  const [duration, setDuration] = useState('');

  const [showPaid, setShowPaid] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(true);

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
            {showUnpaid && unpaidDebts.map(d => (
              <div key={d.id} className={`mt-2 p-3 rounded border ${isOverdue(d) ? 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900' : 'bg-blue-50 dark:bg-blue-100 dark:text-gray-900'}`}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{d.description}</p>
                    <p className="text-sm">{new Date(d.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(d.amount)}</p>
                    <button onClick={() => handleMarkAsPaid(d.id)} className="text-sm text-blue-600 underline">
                      ✅ Marcar como pago
                    </button>
                  </div>
                </div>
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
            {showPaid && paidDebts.map(d => (
              <div key={d.id} className="mt-2 p-3 rounded border bg-gray-200 text-gray-500">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{d.description}</p>
                    <p className="text-sm">{new Date(d.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(d.amount)}</p>
                    <button onClick={() => handleMarkAsUnpaid(d.id)} className="text-sm text-blue-600 underline">
                      ⛔ Marcar como não pago
                    </button>
                  </div>
                </div>
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
