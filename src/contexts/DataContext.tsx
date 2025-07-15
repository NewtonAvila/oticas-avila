import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export type Debt = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  userId: string;
  userName: string;
};

export type Entry = {
  id: string;
  amount: number;
  description: string;
  date: string;
  userId: string;
};

export type UnplannedExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  userId: string;
  userName: string;
};

type DataContextType = {
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  markDebtAsPaid: (id: string) => Promise<void>;
  markDebtAsUnpaid: (id: string) => Promise<void>;

  entries: Entry[];
  addEntry: (amount: number, description: string, date: string) => Promise<void>;

  unplannedExpenses: UnplannedExpense[];
};

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [unplannedExpenses, setUnplannedExpenses] = useState<UnplannedExpense[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubDebts = onSnapshot(collection(db, 'debts'), (snap) => {
      setDebts(
        snap.docs
          .map((d) => {
            const data = d.data() as Omit<Debt, 'id'>;
            return {
              id: d.id,
              ...data,
              amount: data.amount || 0,
              dueDate: data.dueDate || '',
              paid: data.paid || false,
              userId: data.userId || '',
              userName: data.userName || '',
            };
          })
          .filter((d): d is Debt => !!d.id && !!d.description && !isNaN(d.amount))
      );
    });
    const unsubEntries = onSnapshot(collection(db, 'entries'), (snap) => {
      setEntries(
        snap.docs
          .map((doc) => {
            const data = doc.data() as Omit<Entry, 'id'>;
            return {
              id: doc.id,
              ...data,
              amount: data.amount || 0,
              description: data.description || '',
              date: data.date || '',
              userId: data.userId || '',
            };
          })
          .filter((e): e is Entry => !!e.id && !!e.description && !isNaN(e.amount))
      );
    });
    const unsubUnplanned = onSnapshot(collection(db, 'unplannedExpenses'), (snap) => {
      setUnplannedExpenses(
        snap.docs
          .map((doc) => {
            const data = doc.data() as Omit<UnplannedExpense, 'id'>;
            return {
              id: doc.id,
              ...data,
              amount: data.amount || 0,
              description: data.description || '',
              date: data.date || '',
              userId: data.userId || '',
              userName: data.userName || '',
            };
          })
          .filter((e): e is UnplannedExpense => !!e.id && !!e.description && !isNaN(e.amount))
      );
    });
    return () => {
      unsubDebts();
      unsubEntries();
      unsubUnplanned();
    };
  }, [user]);

  const addDebt = async (debt: Omit<Debt, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'debts'), { ...debt, userId: user.id, userName: user.username, createdAt: serverTimestamp() });
  };

  const updateDebt = (id: string, data: Partial<Debt>) =>
    updateDoc(doc(db, 'debts', id), data);

  const deleteDebt = (id: string) =>
    deleteDoc(doc(db, 'debts', id));

  const addEntry = async (amount: number, description: string, date: string) => {
    if (!user) return;
    await addDoc(collection(db, 'entries'), {
      amount,
      description,
      date,
      userId: user.id,
      createdAt: serverTimestamp(),
    });
  };

  const markDebtAsPaid = async (id: string) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt || debt.paid) return;
    await updateDoc(doc(db, 'debts', id), { paid: true });
  };

  const markDebtAsUnpaid = async (id: string) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt || !debt.paid) return;
    await updateDoc(doc(db, 'debts', id), { paid: false });
  };

  return (
    <DataContext.Provider value={{ debts, addDebt, updateDebt, deleteDebt, markDebtAsPaid, markDebtAsUnpaid, entries, addEntry, unplannedExpenses }}>
      {children}
    </DataContext.Provider>
  );
};