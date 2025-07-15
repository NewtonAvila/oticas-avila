import React, { useState, FormEvent } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Definindo a interface para uma entrada
interface Entry {
  id: string;
  description: string;
  amount: number;
  date: string;
  userId: string;
}

const RegisterEntry: React.FC = () => {
  const { entries, addEntry } = useData();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [showEntries, setShowEntries] = useState(true);
  const [editEntry, setEditEntry] = useState<{
    id: string;
    description: string;
    amount: string;
    date: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !description || !amount || !date) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    await addEntry(parsedAmount, description, date);

    setDescription('');
    setAmount('');
    setDate('');
  };

  const handleEditRow = (id: string, description: string, amount: number, date: string) => {
    setEditEntry({ id, description, amount: amount.toString(), date });
  };

  const handleSaveRow = async () => {
    if (editEntry) {
      const parsedAmount = parseFloat(editEntry.amount);
      const parsedDate = new Date(editEntry.date);
      if (!editEntry.description || isNaN(parsedAmount) || parsedAmount <= 0 || !editEntry.date || isNaN(parsedDate.getTime())) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
      }
      try {
        const entryRef = doc(db, 'entries', editEntry.id);
        await updateDoc(entryRef, {
          description: editEntry.description,
          amount: parsedAmount,
          date: editEntry.date,
        });
        setEditEntry(null);
      } catch (err: any) {
        alert('Erro ao salvar alterações: ' + err.message);
      }
    }
  };

  const handleCancelRow = () => {
    setEditEntry(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta entrada?')) {
      try {
        const entryRef = doc(db, 'entries', id);
        await deleteDoc(entryRef);
      } catch (err: any) {
        alert('Erro ao excluir entrada: ' + err.message);
      }
    }
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const groupEntriesByMonth = (entriesList: Entry[]) => {
    const grouped: { [key: string]: Entry[] } = {};
    entriesList.forEach(e => {
      const monthYear = getMonthYear(e.date);
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(e);
    });
    return Object.entries(grouped).map(([month, entries]) => ({
      month,
      entries,
      total: entries.reduce((acc, cur) => acc + (cur.amount || 0), 0)
    }));
  };

  const currentOrFutureEntries = entries
    .filter((e: Entry) => e.date && !isNaN(new Date(e.date).getTime()))
    .sort((a: Entry, b: Entry) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Tipagem explícita
  const groupedEntries = groupEntriesByMonth(currentOrFutureEntries);

  const getTotal = (ds: Entry[]) =>
    ds.reduce((acc: number, cur: Entry) => acc + (cur.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Registrar Entrada" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Suas Entradas</h2>
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Total: {formatCurrency(getTotal(currentOrFutureEntries), 'EUR')}</h3>
              <button onClick={() => setShowEntries(!showEntries)} className="text-sm text-blue-600 underline">
                {showEntries ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showEntries && groupedEntries.map(({ month, entries, total }) => (
              <div key={month}>
                <h3 className="text-md font-medium mt-4 mb-2">{month} - Total: {formatCurrency(total, 'EUR')}</h3>
                {entries.map((e: Entry) => {
                  const isEditing = editEntry?.id === e.id;
                  return (
                    <div key={e.id} className="mt-2 p-3 rounded border bg-green-50 text-gray-900">
                      <div className="flex justify-between">
                        <div>
                          {isEditing && editEntry ? (
                            <>
                              <input
                                type="text"
                                value={editEntry.description}
                                onChange={(e) => setEditEntry({ ...editEntry, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Descrição"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editEntry.amount}
                                onChange={(e) => setEditEntry({ ...editEntry, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded border mb-2"
                                placeholder="Valor (R$)"
                              />
                              <input
                                type="date"
                                value={editEntry.date}
                                onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
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
                              <p className="font-semibold text-green-600">{formatCurrency(e.amount, 'EUR')}</p>
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
          </div>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Nova Entrada</h2>
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
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded">Registrar</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterEntry;