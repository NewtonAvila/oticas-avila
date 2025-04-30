import React, { useEffect, useState } from 'react';
import {
  collection, deleteDoc, doc, getDocs, query, where, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminUserManager: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.isAdmin) getAllUsers();
  }, [user]);

  const getAllUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const all = snapshot.docs.map(doc => doc.data()).filter(u => u.username !== 'admin');
    setUsers(all);
  };

  const selectUser = async (user: any) => {
    setSelectedUser(user);
    const invSnap = await getDocs(query(collection(db, 'investments'), where('userId', '==', user.id)));
    const sessSnap = await getDocs(query(collection(db, 'timeSessions'), where('userId', '==', user.id)));

    setInvestments(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;
    const { id, ...fields } = selectedUser;
    await updateDoc(doc(db, 'users', id), fields);
    setFeedback('Usuário atualizado!');
  };

  const handleDeleteUserAndData = async () => {
    if (!selectedUser) return;
    const confirm = window.confirm('Deseja mesmo deletar este usuário e todos os dados relacionados?');
    if (!confirm) return;

    await deleteDoc(doc(db, 'users', selectedUser.id));

    const invSnap = await getDocs(query(collection(db, 'investments'), where('userId', '==', selectedUser.id)));
    invSnap.forEach(doc => deleteDoc(doc.ref));

    const sessSnap = await getDocs(query(collection(db, 'timeSessions'), where('userId', '==', selectedUser.id)));
    sessSnap.forEach(doc => deleteDoc(doc.ref));

    setFeedback('Usuário e dados apagados com sucesso!');
    setSelectedUser(null);
    getAllUsers();
  };

  const handleInvestmentUpdate = async (id: string, updates: Partial<any>) => {
    await updateDoc(doc(db, 'investments', id), updates);
    setFeedback('Investimento atualizado!');
  };

  const handleDeleteInvestment = async (id: string) => {
    await deleteDoc(doc(db, 'investments', id));
    setInvestments(prev => prev.filter(inv => inv.id !== id));
  };

  const handleSessionUpdate = async (id: string, updates: Partial<any>) => {
    await updateDoc(doc(db, 'timeSessions', id), updates);
    setFeedback('Sessão atualizada!');
  };

  const handleDeleteSession = async (id: string) => {
    await deleteDoc(doc(db, 'timeSessions', id));
    setSessions(prev => prev.filter(sess => sess.id !== id));
  };

  if (!user?.isAdmin) {
    return <div className="p-10 text-center text-red-500 font-semibold">Acesso negado.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Gerenciar Usuários" showBackButton />
      <main className="max-w-5xl mx-auto p-6 space-y-10">
        {feedback && <div className="bg-green-100 text-green-700 p-3 rounded">{feedback}</div>}

        {/* Lista de usuários */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Usuários Registrados</h2>
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="block text-left p-2 w-full hover:bg-gray-100 rounded"
            >
              {u.firstName} {u.lastName} — {u.email}
            </button>
          ))}
        </section>

        {selectedUser && (
          <section className="bg-white p-4 rounded shadow space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Editar Usuário</h3>
              <button
                onClick={handleDeleteUserAndData}
                className="btn bg-red-600 text-white px-4 py-2 rounded"
              >
                Deletar Usuário
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input value={selectedUser.firstName} onChange={e => setSelectedUser({ ...selectedUser, firstName: e.target.value })} className="input-field" placeholder="Nome" />
              <input value={selectedUser.lastName} onChange={e => setSelectedUser({ ...selectedUser, lastName: e.target.value })} className="input-field" placeholder="Sobrenome" />
              <input value={selectedUser.username} onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })} className="input-field" placeholder="Usuário" />
              <input value={selectedUser.email} onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} className="input-field" placeholder="Email" />
            </div>

            <button onClick={handleUserUpdate} className="btn bg-blue-600 text-white px-4 py-2 rounded">
              Salvar Alterações
            </button>

            {/* Investimentos */}
            <div>
              <h4 className="text-md font-semibold mb-2 mt-6">Investimentos</h4>
              {investments.map(inv => (
                <div key={inv.id} className="flex gap-2 items-center border-b py-2">
                  <input
                    defaultValue={inv.description}
                    className="input-field"
                    onBlur={(e) => handleInvestmentUpdate(inv.id, { description: e.target.value })}
                  />
                  <input
                    type="number"
                    defaultValue={inv.amount}
                    className="input-field w-32"
                    onBlur={(e) => handleInvestmentUpdate(inv.id, { amount: parseFloat(e.target.value) })}
                  />
                  <button onClick={() => handleDeleteInvestment(inv.id)} className="text-red-600 text-sm">Excluir</button>
                </div>
              ))}
            </div>

            {/* Sessões de tempo */}
            <div>
              <h4 className="text-md font-semibold mb-2 mt-6">Sessões de Tempo</h4>
              {sessions.map(sess => (
                <div key={sess.id} className="grid grid-cols-4 items-center gap-2 border-b py-2 text-sm">
                  <input
                    type="number"
                    defaultValue={sess.hourlyRate}
                    className="input-field"
                    onBlur={(e) => handleSessionUpdate(sess.id, { hourlyRate: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    defaultValue={sess.pausedTime}
                    className="input-field"
                    onBlur={(e) => handleSessionUpdate(sess.id, { pausedTime: parseInt(e.target.value) })}
                  />
                  <select
                    defaultValue={sess.isPaid ? 'true' : 'false'}
                    className="input-field"
                    onChange={(e) => handleSessionUpdate(sess.id, { isPaid: e.target.value === 'true' })}
                  >
                    <option value="true">Pago</option>
                    <option value="false">Investido</option>
                  </select>
                  <button onClick={() => handleDeleteSession(sess.id)} className="text-red-600 text-sm">Excluir</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminUserManager;
