import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Investment = {
  id: string;
  description: string;
  amount: number;
  userName: string;
  userId: string;
};

type TimeSession = {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  hourlyRate: number;
  pausedTime: number;
  isPaid: boolean;
  isCompleted: boolean;
};

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const investmentsSnapshot = await getDocs(collection(db, 'investments'));
    const sessionsSnapshot = await getDocs(collection(db, 'timeSessions'));

    setUsers(usersSnapshot.docs.map(doc => doc.data()));
    setInvestments(investmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    setSessions(sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeSession)));
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchData();
    }
  }, [user]);

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      await deleteDoc(doc(db, 'users', id));
      setFeedback('Usuário deletado com sucesso.');
      fetchData();
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (confirm('Deletar investimento?')) {
      await deleteDoc(doc(db, 'investments', id));
      setFeedback('Investimento deletado.');
      fetchData();
    }
  };

  const handleEditInvestment = async (id: string, description: string, amount: number) => {
    await updateDoc(doc(db, 'investments', id), { description, amount });
    setFeedback('Investimento atualizado!');
    fetchData();
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Deletar sessão de tempo?')) {
      await deleteDoc(doc(db, 'timeSessions', id));
      setFeedback('Sessão deletada.');
      fetchData();
    }
  };

  const handleEditSession = async (session: TimeSession) => {
    await updateDoc(doc(db, 'timeSessions', session.id), {
      hourlyRate: session.hourlyRate,
      pausedTime: session.pausedTime,
      isPaid: session.isPaid
    });
    setFeedback('Sessão atualizada!');
    fetchData();
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-red-500">
          Acesso negado. Apenas administradores podem ver esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Painel Administrativo" showBackButton />
      <main className="container mx-auto p-6 space-y-12">

        {/* Botão extra para gerenciar usuários */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/admin-users')}
            className="btn bg-blue-600 text-white px-4 py-2 rounded"
          >
            Gerenciar Usuários Detalhadamente
          </button>
        </div>

        {feedback && <div className="bg-green-100 text-green-800 p-4 rounded">{feedback}</div>}

        {/* Usuários */}
        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Usuários</h2>
          {users.map(u => (
            <div key={u.id} className="flex justify-between items-center border-b py-2">
              <div>
                <p className="font-medium">{u.firstName} {u.lastName}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              {u.username !== 'admin' && (
                <button onClick={() => handleDeleteUser(u.id)} className="btn bg-red-500 text-white px-3 py-1 rounded">
                  Deletar
                </button>
              )}
            </div>
          ))}
        </section>

        {/* Investimentos */}
        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Investimentos</h2>
          {investments.map(inv => (
            <div key={inv.id} className="border-b py-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="w-full space-y-1">
                  <input
                    type="text"
                    defaultValue={inv.description}
                    onBlur={(e) => handleEditInvestment(inv.id, e.target.value, inv.amount)}
                    className="input-field w-full"
                  />
                  <input
                    type="number"
                    defaultValue={inv.amount}
                    onBlur={(e) => handleEditInvestment(inv.id, inv.description, parseFloat(e.target.value))}
                    className="input-field w-full"
                  />
                  <p className="text-sm text-gray-500">{inv.userName}</p>
                </div>
                <button
                  onClick={() => handleDeleteInvestment(inv.id)}
                  className="btn bg-red-500 text-white px-3 py-1 rounded ml-4"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Sessões de Tempo */}
        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Sessões de Tempo</h2>
          {sessions.map(session => (
            <div key={session.id} className="border-b py-3 space-y-2">
              <div className="flex flex-col gap-2">
                <label>Usuário: {session.userId}</label>
                <input
                  type="number"
                  defaultValue={session.hourlyRate}
                  onBlur={(e) => handleEditSession({ ...session, hourlyRate: parseFloat(e.target.value) })}
                  className="input-field"
                  placeholder="Valor Hora"
                />
                <input
                  type="number"
                  defaultValue={session.pausedTime}
                  onBlur={(e) => handleEditSession({ ...session, pausedTime: parseInt(e.target.value) })}
                  className="input-field"
                  placeholder="Tempo Pausado (ms)"
                />
                <select
                  defaultValue={session.isPaid ? 'true' : 'false'}
                  onChange={(e) => handleEditSession({ ...session, isPaid: e.target.value === 'true' })}
                  className="input-field"
                >
                  <option value="true">Pago</option>
                  <option value="false">Investido</option>
                </select>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="btn bg-red-600 text-white px-3 py-1 rounded w-fit"
                >
                  Deletar Sessão
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default AdminPanel;
