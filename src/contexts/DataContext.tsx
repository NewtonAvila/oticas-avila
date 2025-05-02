// src/contexts/DataContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export type Investment = {
  id: string;
  description: string;
  amount: number;
  userId: string;
  userName: string;
  date: string;
  isTimeInvestment: boolean;
};

export type TimeSession = {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  pausedTime: number;
  hourlyRate: number;
  isPaid: boolean;
  isCompleted: boolean;
};

export type Debt = {
  id: string;
  description: string;
  amount: number;
  type: 'único' | 'fixo';
  dueDate: string;
  duration?: number;
  paid: boolean;
  userId: string;
  userName: string;
};

// ————— Novo tipo para Produtos —————
export type Product = {
  id: string;
  seq: number;
  description: string;
  costPrice: number;
  profitMargin: number; // em %
  salePrice: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
};

type DataContextType = {
  // Investimentos
  investments: Investment[];
  addInvestment: (description: string, amount: number, isTimeInvestment?: boolean) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  getTotalInvestment: () => number;
  getUserInvestmentPercentage: () => number;
  getUserContributionAmount: () => number;
  getAllUsersInvestmentData: () => Array<{ name: string; amount: number; percentage: number }>;

  // Sessões de Tempo
  timeSessions: TimeSession[];
  startTimeSession: (hourlyRate: number) => string;
  stopTimeSession: (sessionId: string, isPaid: boolean) => Promise<void>;
  getCurrentTimeSession: () => TimeSession | null;

  // Débitos
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  markDebtAsPaid: (id: string) => Promise<void>;
  markDebtAsUnpaid: (id: string) => Promise<void>;

  // —— NOVO: Produtos
  products: Product[];
  addProduct: (
    p: Omit<Product, 'id' | 'seq' | 'salePrice' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
  ) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<Omit<Product, 'id' | 'seq' | 'salePrice' | 'createdAt' | 'createdBy'>>
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (term: string) => Promise<Product[]>;
  getTotalProductValue: () => number;
};

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // — snapshot de todas as coleções
  useEffect(() => {
    const unsubInv = onSnapshot(collection(db, 'investments'), snap =>
      setInvestments(snap.docs.map(d => ({ ...(d.data() as Omit<Investment, 'id'>), id: d.id })))
    );
    const unsubSess = onSnapshot(collection(db, 'timeSessions'), snap =>
      setTimeSessions(snap.docs.map(d => ({ ...(d.data() as Omit<TimeSession, 'id'>), id: d.id })))
    );
    const unsubDebt = onSnapshot(collection(db, 'debts'), snap =>
      setDebts(snap.docs.map(d => ({ ...(d.data() as Omit<Debt, 'id'>), id: d.id })))
    );
    const unsubProd = onSnapshot(collection(db, 'products'), snap =>
      setProducts(snap.docs.map(d => ({ ...(d.data() as Omit<Product, 'id'>), id: d.id })))
    );
    return () => {
      unsubInv();
      unsubSess();
      unsubDebt();
      unsubProd();
    };
  }, []);

  // — Investimentos
  const addInvestment = async (description: string, amount: number, isTimeInvestment = false) => {
    if (!user) return;
    await addDoc(collection(db, 'investments'), {
      description,
      amount,
      isTimeInvestment,
      userId: user.id,
      userName: user.username,
      date: new Date().toISOString()
    });
  };
  const updateInvestment = async (id: string, data: Partial<Investment>) =>
    updateDoc(doc(db, 'investments', id), data);
  const deleteInvestment = async (id: string) =>
    deleteDoc(doc(db, 'investments', id));
  const getTotalInvestment = () =>
    investments.reduce((sum, i) => sum + i.amount, 0);
  const getUserContributionAmount = () =>
    user
      ? investments.filter(i => i.userId === user.id).reduce((sum, i) => sum + i.amount, 0)
      : 0;
  const getUserInvestmentPercentage = () => {
    const total = getTotalInvestment();
    const yours = getUserContributionAmount();
    return total > 0 ? (yours / total) * 100 : 0;
  };
  const getAllUsersInvestmentData = () => {
    const map: Record<string, { name: string; amount: number }> = {};
    investments.forEach(i => {
      if (!map[i.userId]) map[i.userId] = { name: i.userName, amount: 0 };
      map[i.userId].amount += i.amount;
    });
    const total = getTotalInvestment();
    return Object.values(map).map(u => ({
      name: u.name,
      amount: u.amount,
      percentage: total > 0 ? (u.amount / total) * 100 : 0
    }));
  };

  // — Sessões de Tempo
  const startTimeSession = (hourlyRate: number): string => {
    if (!user) return '';
    const session = {
      userId: user.id,
      startTime: new Date().toISOString(),
      endTime: null,
      pausedTime: 0,
      hourlyRate,
      isPaid: false,
      isCompleted: false
    };
    const ref = doc(collection(db, 'timeSessions'));
    addDoc(collection(db, 'timeSessions'), { ...session, id: ref.id });
    return ref.id;
  };
  const stopTimeSession = async (sessionId: string, isPaid: boolean) => {
    const sess = timeSessions.find(s => s.id === sessionId);
    if (!sess || !user) return;
    const endTime = new Date().toISOString();
    await updateDoc(doc(db, 'timeSessions', sessionId), {
      endTime,
      isPaid,
      isCompleted: true
    });
    if (!isPaid) {
      const hours = (new Date(endTime).getTime() - new Date(sess.startTime).getTime() - sess.pausedTime) / 3600000;
      await addInvestment(`Investimento de Tempo (${hours.toFixed(2)}h)`, hours * sess.hourlyRate, true);
    }
  };
  const getCurrentTimeSession = () =>
    user ? timeSessions.find(s => s.userId === user.id && !s.isCompleted) || null : null;

  // — Débitos
  const addDebt = async (d: Omit<Debt, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'debts'), d);
  };
  const updateDebt = async (id: string, data: Partial<Debt>) =>
    updateDoc(doc(db, 'debts', id), data);
  const deleteDebt = async (id: string) =>
    deleteDoc(doc(db, 'debts', id));
  const markDebtAsPaid = async (id: string) =>
    updateDoc(doc(db, 'debts', id), { paid: true });
  const markDebtAsUnpaid = async (id: string) =>
    updateDoc(doc(db, 'debts', id), { paid: false });

  // — Produtos com seq auto-increment
  const addProduct = async (
    p: Omit<Product, 'id' | 'seq' | 'salePrice' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
  ) => {
    if (!user) return;
    await runTransaction(db, async tx => {
      const counterRef = doc(db, 'counters', 'products');
      // lê ou inicia contador
      const counterSnap = await tx.get(counterRef);
      const lastSeq: number = (counterSnap.exists() && counterSnap.data().lastSeq) || 0;
      const newSeq = lastSeq + 1;
      // atualiza contador
      tx.set(counterRef, { lastSeq: newSeq }, { merge: true });

      // prepara dados do produto
      const now = new Date().toISOString();
      const salePrice = p.costPrice * (1 + p.profitMargin / 100);
      const prodRef = doc(collection(db, 'products')) as DocumentReference<Product>;

      // grava produto incluindo id e seq
      tx.set(prodRef, {
        id: prodRef.id,
        seq: newSeq,
        description: p.description,
        costPrice: p.costPrice,
        profitMargin: p.profitMargin,
        salePrice,
        createdAt: now,
        createdBy: user.id
      });
    });
  };

  const updateProduct = async (
    id: string,
    updates: Partial<Omit<Product, 'id' | 'seq' | 'salePrice' | 'createdAt' | 'createdBy'>>
  ) => {
    if (!user) return;
    // recalcula salePrice
    const orig = products.find(x => x.id === id)!;
    const cost = updates.costPrice ?? orig.costPrice;
    const margin = updates.profitMargin ?? orig.profitMargin;
    const salePrice = cost * (1 + margin / 100);
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      salePrice,
      updatedAt: now,
      updatedBy: user.id
    });
  };

  const deleteProduct = async (id: string) =>
    deleteDoc(doc(db, 'products', id));

  const searchProducts = async (term: string): Promise<Product[]> => {
    // primeiro tenta por seq exato
    const bySeq = products.find(p => p.seq.toString() === term);
    if (bySeq) return [bySeq];
    // senão busca por descrição
    const q = query(
      collection(db, 'products'),
      where('description', '>=', term),
      where('description', '<=', term + '\uf8ff')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...(d.data() as Omit<Product, 'id'>), id: d.id }));
  };

  const getTotalProductValue = () =>
    products.reduce((sum, p) => sum + p.salePrice, 0);

  return (
    <DataContext.Provider
      value={{
        investments,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        getTotalInvestment,
        getUserInvestmentPercentage,
        getUserContributionAmount,
        getAllUsersInvestmentData,

        timeSessions,
        startTimeSession,
        stopTimeSession,
        getCurrentTimeSession,

        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        markDebtAsPaid,
        markDebtAsUnpaid,

        products,
        addProduct,
        updateProduct,
        deleteProduct,
        searchProducts,
        getTotalProductValue
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
