import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const EntradaSaidaControl: React.FC = () => {
  const { user } = useAuth();
  const { cashMovements, addCashMovement } = useData();
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'saida'>('entrada');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMovement, setEditMovement] = useState<{
    id: string;
    description: string;
    amount: string;
  } | null>(null);

  const totalEntries = cashMovements
    .filter(m => m.type === 'entrada')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalExits = cashMovements
    .filter(m => m.type === 'saida')
    .reduce((sum, m) => sum + m.amount, 0);
  const balance = totalEntries - totalExits;

  useEffect(() => {
    if (!user) return;
  }, [user]);

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentAmount || !description) return;
    const valor = parseFloat(adjustmentAmount);
    if (isNaN(valor) || valor <= 0) {
      setError('O valor deve ser maior que 0.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      await addCashMovement(adjustmentType, valor, description);
      setAdjustmentAmount('');
      setDescription('');
    } catch (err: any) {
      setError('Erro ao registrar ajuste: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (id: string, description: string, amount: number) => {
    setEditMovement({ id, description, amount: amount.toString() });
  };

  const handleSaveRow = async () => {
    if (editMovement) {
      const amountValue = parseFloat(editMovement.amount);
      if (!editMovement.description.trim() || isNaN(amountValue) || amountValue <= 0) {
        alert('Por favor, insira uma descrição e um valor válido maior que 0.');
        return;
      }
      try {
        const movementRef = doc(db, 'cashMovements', editMovement.id);
        await updateDoc(movementRef, {
          description: editMovement.description,
          amount: amountValue,
        });
        setEditMovement(null);
      } catch (err: any) {
        alert('Erro ao salvar alterações: ' + err.message);
      }
    }
  };

  const handleCancelRow = () => {
    setEditMovement(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este movimento?')) {
      try {
        const movementRef = doc(db, 'cashMovements', id);
        await deleteDoc(movementRef);
      } catch (err: any) {
        alert('Erro ao excluir movimento: ' + err.message);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Controle de Entradas e Saídas" showBackButton />
      <main className="container mx-auto p-6">
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Saldo Atual</h2>
          <p className="text-xl">
            Saldo: <strong>{formatCurrency(balance)}</strong>
          </p>
          <p>Entradas: {formatCurrency(totalEntries)}</p>
          <p>Saídas: {formatCurrency(totalExits)}</p>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Registrar Movimento</h2>
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <form onSubmit={handleAdjustment} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Tipo</label>
              <select
                value={adjustmentType}
                onChange={e => setAdjustmentType(e.target.value as 'entrada' | 'saida')}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={adjustmentAmount}
                onChange={e => setAdjustmentAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ex.: 2500.00"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full py-2 rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Movimentações</h2>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {cashMovements.map(m => {
              const isEditing = editMovement?.id === m.id;
              return (
                <div
                  key={m.id}
                  className="p-3 rounded border flex justify-between items-center bg-gray-50 dark:bg-gray-700"
                >
                  <div>
                    {isEditing && editMovement ? (
                      <>
                        <input
                          type="text"
                          value={editMovement.description}
                          onChange={e => setEditMovement({ ...editMovement, description: e.target.value })}
                          className="w-48 px-3 py-2 border rounded mb-2"
                          placeholder="Descrição"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editMovement.amount}
                          onChange={e => setEditMovement({ ...editMovement, amount: e.target.value })}
                          className="w-24 px-3 py-2 border rounded"
                          placeholder="0.00"
                        />
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{m.description}</p>
                        {m.date && <p className="text-sm">{new Date(m.date).toLocaleString()}</p>}
                      </>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <p className={`font-semibold ${m.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(m.amount)}
                        </p>
                        <button onClick={() => handleEditRow(m.id, m.description, m.amount)} className="text-blue-600 hover:text-blue-800">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800">
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
              );
            })}
            {!cashMovements.length && <p className="text-gray-500 text-sm italic">Nenhuma movimentação registrada.</p>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EntradaSaidaControl;