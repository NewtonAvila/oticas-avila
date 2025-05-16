// src/pages/CashControl.tsx
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { Edit, Trash } from 'lucide-react';

interface CashMovement {
  id: string;
  type: 'entrada' | 'saida';
  amount: number; // in reais
  description: string;
  date: Timestamp | null;
  userID: string;
  userName: string;
  source: 'manual' | 'sale' | 'debt_payment';
}

const CashControl: React.FC = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] =
    useState<'entrada' | 'saida'>('entrada');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMovement, setEditMovement] = useState<{
    id: string;
    description: string;
    amount: string;
  } | null>(null);

  // calcula saldo
  const totalEntries = movements
    .filter(m => m.type === 'entrada')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalExits = movements
    .filter(m => m.type === 'saida')
    .reduce((sum, m) => sum + m.amount, 0);
  const balance = totalEntries - totalExits;

  // escuta em tempo real
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'cashMovements'),
      snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<CashMovement, 'id'>)
        }));
        // ordena tolerante a date=null
        data.sort((a, b) => {
          const ta = a.date ? a.date.toMillis() : 0;
          const tb = b.date ? b.date.toMillis() : 0;
          return tb - ta;
        });
        setMovements(data);
      },
      err => {
        console.error('Erro ao escutar movimentos:', err);
        setError('Erro ao carregar movimentos: ' + err.message);
      }
    );
    return () => unsub();
  }, [user]);

  // registra ajuste
  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentAmount || !description) return;
    const rawValue = adjustmentAmount.replace(/[^0-9.,]/g, '').replace(',', '.');
    const valor = parseFloat(rawValue);
    console.log('Valor bruto (rawValue):', rawValue);
    console.log('Valor digitado (parseFloat):', valor);
    if (isNaN(valor) || valor <= 0) {
      console.log('Valor inválido:', valor);
      setError('O valor deve ser maior que 0.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      console.log('Valor em reais:', valor);
      await addDoc(collection(db, 'cashMovements'), {
        type: adjustmentType,
        amount: valor,
        description,
        date: serverTimestamp(),
        userID: user.id,
        userName: user.firstName || 'Usuário',
        source: 'manual'
      });
      setAdjustmentAmount('');
      setDescription('');
    } catch (err: any) {
      console.error('Erro ao registrar ajuste:', err);
      setError('Erro ao registrar ajuste: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // edit movement
  const handleEditRow = (id: string, description: string, amount: number) => {
    setEditMovement({ id, description, amount: amount.toString() });
  };

  const handleSaveRow = async () => {
    if (editMovement) {
      const amountValue = parseFloat(editMovement.amount.replace(',', '.'));
      if (!editMovement.description.trim()) {
        alert('Por favor, insira uma descrição.');
        return;
      }
      if (isNaN(amountValue) || amountValue <= 0) {
        alert('Insira um valor válido.');
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
        console.error('Erro ao atualizar movimento:', err);
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
        console.error('Erro ao excluir movimento:', err);
        alert('Erro ao excluir movimento: ' + err.message);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Controle de Caixa" showBackButton />
      <main className="container mx-auto p-6">
        {/* Saldo Atual */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Saldo Atual</h2>
          <p className="text-xl">
            Saldo:{' '}
            <strong>
              {formatCurrency(balance)}
            </strong>
          </p>
          <p>Entradas: {formatCurrency(totalEntries)}</p>
          <p>Saídas: {formatCurrency(totalExits)}</p>
        </section>

        {/* Formulário de Ajuste */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Ajustar Caixa</h2>
          {error && (
            <p className="text-red-600 mb-2">{error}</p>
          )}
          <form onSubmit={handleAdjustment} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Tipo</label>
              <select
                value={adjustmentType}
                onChange={e =>
                  setAdjustmentType(
                    e.target.value as 'entrada' | 'saida'
                  )
                }
                className="input-field w-full"
              >
                <option value="entrada">Adicionar (+)</option>
                <option value="saida">Subtrair (-)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={adjustmentAmount}
                onChange={e =>
                  setAdjustmentAmount(e.target.value)
                }
                className="input-field"
                placeholder="Ex.: 2500 ou 1490,25"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={e =>
                  setDescription(e.target.value)
                }
                className="input-field"
                required
              />
            </div>
            <button
              type="submit"
              className={`btn-primary w-full ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              disabled={loading}
            >
              {loading
                ? 'Registrando...'
                : 'Registrar Ajuste'}
            </button>
          </form>
        </section>

        {/* Movimentações */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">
            Movimentações
          </h2>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {movements.map(m => {
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
                          onChange={(e) =>
                            setEditMovement({ ...editMovement, description: e.target.value })
                          }
                          className="input-field w-48 mb-2"
                          placeholder="Descrição"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editMovement.amount}
                          onChange={(e) =>
                            setEditMovement({ ...editMovement, amount: e.target.value })
                          }
                          className="input-field w-24"
                          placeholder="0,00"
                        />
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{m.description}</p>
                        {m.date && (
                          <p className="text-sm">
                            {m.date.toDate().toLocaleDateString()}{' '}
                            {m.date.toDate().toLocaleTimeString()} – {m.userName}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <p
                          className={`font-semibold ${
                            m.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(m.amount)}
                        </p>
                        <button
                          onClick={() => handleEditRow(m.id, m.description, m.amount)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
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
                          className="btn-primary px-2 py-1 text-sm"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelRow}
                          className="btn-outline px-2 py-1 text-sm"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!movements.length && (
              <p className="text-gray-500 text-sm italic">
                Nenhuma movimentação registrada.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CashControl;