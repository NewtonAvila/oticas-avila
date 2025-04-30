import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc, where, query } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
};

type Investment = {
  id: string;
  userId: string;
  description: string;
  amount: number;
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

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (user?.isAdmin) fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const data = snapshot.docs
      .map(doc => doc.data() as User)
      .filter(u => u.username !== 'admin');
    setUsers(data);
  };

  const fetchUserDetails = async (userId: string) => {
    const [investmentsSnap, sessionsSnap] = await Promise.all([
      getDocs(query(collection(db, 'investments'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'timeSessions'), where('userId', '==', userId)))
    ]);

    const inv = investmentsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Investment));
    const ses = sessionsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeSession));

    setInvestments(inv);
    setSessions(ses);
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    await fetchUserDetails(user.id);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    await updateDoc(doc(db, 'users', selectedUser.id), selectedUser);
    setFeedback('Usuário atualizado!');
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const confirmDelete = confirm('Tem certeza que deseja excluir este usuário e todos os dados vinculados?');
    if (!confirmDelete) return;

    const investmentDocs = await getDocs(query(collection(db, 'investments'), where('userId', '==', selectedUser.id)));
    const sessionDocs = await getDocs(query(collection(db, 'timeSessions'), where('userId', '==', selectedUser.id)));

    await Promise.all([
      ...investmentDocs.docs.map(d => deleteDoc(doc(db, 'investments', d.id))),
      ...sessionDocs.docs.map(d => deleteDoc(doc(db, 'timeSessions', d.id))),
      deleteDoc(doc(db, 'users', selectedUser.id))
    ]);

    setSelectedUser(null);
    fetchUsers();
    setFeedback('Usuário e dados vinculados excluídos.');
  };

  if (!user?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Acesso negado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Gerenciar Usuários" showBackButton />

      <main className="container mx-auto px-4 py-6">
        {feedback && <div className="bg-green-100 text-green-800 p-3 rounded mb-6">{feedback}</div>}

        {/* Lista de usuários */}
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Usuários</h2>
          <ul className="space-y-2">
            {users.map(u => (
              <li key={u.id} className="flex justify-between items-center border-b pb-2">
                <span>{u.firstName} {u.lastName} - {u.username}</span>
                <button className="text-blue-600 font-medium" onClick={() => handleSelectUser(u)}>Selecionar</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Detalhes do usuário selecionado */}
        {selectedUser && (
          <div className="bg-white rounded shadow p-6 space-y-6">
            <h2 className="text-lg font-bold mb-4">Detalhes do Usuário</h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="input-field"
                value={selectedUser.firstName}
                onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                placeholder="Nome"
              />
              <input
                className="input-field"
                value={selectedUser.lastName}
                onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                placeholder="Sobrenome"
              />
              <input
                className="input-field"
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                placeholder="Email"
              />
              <input
                className="input-field"
                value={selectedUser.username}
                onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                placeholder="Usuário"
              />
            </div>

            <div className="flex gap-4">
              <button onClick={handleUpdateUser} className="btn bg-green-600 text-white px-4 py-2 rounded">
                Salvar Alterações
              </button>
              <button onClick={handleDeleteUser} className="btn bg-red-600 text-white px-4 py-2 rounded">
                Deletar Usuário
              </button>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Investimentos</h3>
              {investments.length === 0 ? <p className="text-sm text-gray-500">Nenhum investimento.</p> : (
                <ul className="space-y-1">
                  {investments.map(inv => (
                    <li key={inv.id} className="text-sm border-b pb-1">
                      {inv.description} — {formatCurrency(inv.amount)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Sessões de Tempo</h3>
              {sessions.length === 0 ? <p className="text-sm text-gray-500">Nenhuma sessão registrada.</p> : (
                <ul className="space-y-1 text-sm">
                  {sessions.map(s => (
                    <li key={s.id} className="border-b pb-1">
                      Início: {new Date(s.startTime).toLocaleString()} <br />
                      Fim: {s.endTime ? new Date(s.endTime).toLocaleString() : 'Em andamento'} <br />
                      Valor/hora: {formatCurrency(s.hourlyRate)} — Status: {s.isPaid ? 'Pago' : 'Investido'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsers;
