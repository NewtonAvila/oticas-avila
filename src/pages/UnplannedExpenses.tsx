import React, { useState, FormEvent } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';
import { doc, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

// Definindo a interface para um gasto não planejado
interface UnplannedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  userId: string;
  userName: string;
}

const UnplannedExpenses: React.FC = () => {
  const { user } = useAuth();
  const [unplannedExpenses, setUnplannedExpenses] = useState<UnplannedExpense[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [editExpense, setEditExpense] = useState<{
    id: string;
    description: string;
    amount: string;
    date: string;
  } | null>(null);

  // Carregar gastos não planejados do Firestore
  React.useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'unplannedExpenses'), (snap: QuerySnapshot<DocumentData>) => {
      setUnplannedExpenses(
        snap.docs
          .map((doc: DocumentData) => ({
            id: doc.id,
            ...doc.data() as Omit<UnplannedExpense, 'id'>
          }))
          .filter((e): e is UnplannedExpense => !!e.id && !!e.description && !isNaN(e.amount))
      );
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !description || !amount || !date) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    await addDoc(collection(db, 'unplannedExpenses'), {
      description,
      amount: parsedAmount,
      date,
      userId: user.id,
      userName: user.username,
      createdAt: serverTimestamp()
    });

    setDescription('');
    setAmount('');
    setDate('');
  };

  const handleEditRow = (id: string, description: string, amount: number, date: string) => {
    setEditExpense({ id, description, amount: amount.toString(), date });
  };

  const handleSaveRow = async () => {
    if (editExpense) {
      const parsedAmount = parseFloat(editExpense.amount);
      const parsedDate = new Date(editExpense.date);
      if (!editExpense.description || isNaN(parsedAmount) || parsedAmount <= 0 || !editExpense.date || isNaN(parsedDate.getTime())) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
      }
      try {
        const expenseRef = doc(db, 'unplannedExpenses', editExpense.id);
        await updateDoc(expenseRef, {
          description: editExpense.description,
          amount: parsedAmount,
          date: editExpense.date,
        });
        setEditExpense(null);
      } catch (err: any) {
        alert('Erro ao salvar alterações: ' + err.message);
      }
    }
  };

  const handleCancelRow = () => {
    setEditExpense(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este gasto?')) {
      try {
        const expenseRef = doc(db, 'unplannedExpenses', id);
        await deleteDoc(expenseRef);
      } catch (err: any) {
        alert('Erro ao excluir gasto: ' + err.message);
      }
    }
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const groupExpensesByMonth = (expensesList: UnplannedExpense[]) => {
    const grouped: { [key: string]: UnplannedExpense[] } = {};
    expensesList.forEach(e => {
      const monthYear = getMonthYear(e.date);
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(e);
    });
    return Object.entries(grouped).map(([month, expenses]) => ({
      month,
      expenses,
      total: expenses.reduce((acc, cur) => acc + (cur.amount || 0), 0)
    }));
  };

  const currentOrFutureExpenses = unplannedExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const groupedExpenses = groupExpensesByMonth(currentOrFutureExpenses);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Gastos não Planejados" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Seus Gastos</h2>
          {groupedExpenses.map(({ month, expenses, total }) => (
            <div key={month}>
              <h3 className="text-md font-medium mt-4 mb-2">{month} - Total: {formatCurrency(total, 'EUR')}</h3>
              {expenses.map((e) => {
                const isEditing = editExpense?.id === e.id;
                return (
                  <div key={e.id} className="mt-2 p-3 rounded border bg-red-50 text-gray-900">
                    <div className="flex justify-between">
                      <div>
                        {isEditing && editExpense ? (
                          <>
                            <input
                              type="text"
                              value={editExpense.description}
                              onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })}
                              className="w-full px-3 py-2 rounded border mb-2"
                              placeholder="Descrição"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={editExpense.amount}
                              onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                              className="w-full px-3 py-2 rounded border mb-2"
                              placeholder="Valor (R$)"
                            />
                            <input
                              type="date"
                              value={editExpense.date}
                              onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })}
                              className="w-full px-3 py-2 rounded border mb-2"
                            />
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{e.description}</p>
                            <p className="text-sm">{new Date(e.date).toLocaleDateString()}</p>
                          </>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {!isEditing && (
                          <>
                            <p className="font-semibold text-red-600">{formatCurrency(e.amount, 'EUR')}</p>
                            <button onClick={() => handleEditRow(e.id, e.description, e.amount, e.date)} className="text-blue-600 hover:text-blue-800">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800">
                              <Trash size={16} />
                            </button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <button onClick={handleSaveRow} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Salvar</button>
                            <button onClick={handleCancelRow} className="bg-gray-500 text-white px-2 py-1 rounded text-sm">Cancelar</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Novo Gasto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              placeholder="Valor (R$)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <input
              type="date"
              className="w-full px-3 py-2 rounded border bg-white dark:bg-gray-700"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded">Registrar</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default UnplannedExpenses;