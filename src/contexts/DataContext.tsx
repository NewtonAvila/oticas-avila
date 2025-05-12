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
  sessionId?: string;
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

export type Sale = {
  id: string;
  seq: number;
  productId: string;
  description: string;
  unitPrice: number;
  discountPercent: number;
  finalUnitPrice: number;
  quantity: number;
  totalPrice: number;
  soldAt: string;
  soldBy: string;
  canceled?: boolean;
};

export type Product = {
  id: string;
  seq: number;
  description: string;
  costPrice: number;
  profitMargin: number;
  salePrice: number;
  quantity: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
};

type DataContextType = {
  investments: Investment[];
  addInvestment: (description: string, amount: number, isTimeInvestment?: boolean, sessionId?: string) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  getTotalInvestment: () => number;
  getUserInvestmentPercentage: () => number;
  getUserContributionAmount: () => number;
  getAllUsersInvestmentData: () => Array<{ name: string; amount: number; percentage: number }>;

  timeSessions: TimeSession[];
  startTimeSession: (hourlyRate: number, isPaid: boolean) => string;
  stopTimeSession: (sessionId: string, isPaid: boolean) => Promise<void>;
  getCurrentTimeSession: () => TimeSession | null;
  updateTimeSession: (id: string, data: Partial<TimeSession>) => Promise<void>;
  deleteTimeSession: (id: string) => Promise<void>;

  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  markDebtAsPaid: (id: string) => Promise<void>;
  markDebtAsUnpaid: (id: string) => Promise<void>;

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

  sales: Sale[];
  addSale: (s: Omit<Sale, 'id' | 'seq' | 'soldAt' | 'soldBy' | 'canceled'>) => Promise<void>;
  undoSale: (id: string) => Promise<void>;
  getSales: (opts?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
    userId?: string;
    includeCanceled?: boolean;
  }) => Promise<Sale[]>;
};

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const unsubInv = onSnapshot(collection(db, 'investments'), snap =>
      setInvestments(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })))
    );
    const unsubSess = onSnapshot(collection(db, 'timeSessions'), snap =>
      setTimeSessions(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })))
    );
    const unsubDebt = onSnapshot(collection(db, 'debts'), snap =>
      setDebts(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })))
    );
    const unsubProd = onSnapshot(collection(db, 'products'), snap =>
      setProducts(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })))
    );
    const unsubSales = onSnapshot(collection(db, 'vendas'), snap => {
      const updatedSales = snap.docs.map(d => ({ ...(d.data() as Sale), id: d.id }));
      setSales(updatedSales);
    }, (error) => {
      console.error('Error in onSnapshot for vendas:', error);
    });

    return () => {
      unsubInv();
      unsubSess();
      unsubDebt();
      unsubProd();
      unsubSales();
    };
  }, []);

  const addInvestment = async (description: string, amount: number, isTimeInvestment = false, sessionId?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'investments'), {
        description,
        amount,
        isTimeInvestment,
        userId: user.id,
        userName: user.username,
        date: new Date().toISOString(),
        sessionId
      });
      console.log('Investimento adicionado com sucesso:', { description, amount, sessionId });
    } catch (error) {
      console.error('Erro ao adicionar investimento:', error);
    }
  };

  const updateInvestment = (id: string, data: Partial<Investment>) =>
    updateDoc(doc(db, 'investments', id), data);

  const deleteInvestment = (id: string) =>
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

  const startTimeSession = (hourlyRate: number, isPaid: boolean): string => {
    if (!user) return '';
    const ref = doc(collection(db, 'timeSessions'));
    addDoc(collection(db, 'timeSessions'), {
      id: ref.id,
      userId: user.id,
      startTime: new Date().toISOString(),
      endTime: null,
      pausedTime: 0,
      hourlyRate,
      isPaid,
      isCompleted: false
    });
    return ref.id;
  };

  const stopTimeSession = async (sessionId: string, isPaid: boolean) => {
    const sess = timeSessions.find(s => s.id === sessionId);
    if (!sess || !user) {
      console.error('Sessão ou usuário não encontrado ao parar:', { sessionId, user });
      return;
    }
    try {
      const endTime = new Date().toISOString();
      await updateDoc(doc(db, 'timeSessions', sessionId), {
        endTime,
        isPaid,
        isCompleted: true
      });
      console.log('Sessão atualizada com sucesso:', { sessionId, endTime, isPaid });

      if (!isPaid) {
        const hours =
          (new Date(endTime).getTime() -
            new Date(sess.startTime).getTime() -
            sess.pausedTime) /
          3600000;
        await addInvestment(
          `Investimento de Tempo (${hours.toFixed(2)}h)`,
          hours * sess.hourlyRate,
          true,
          sessionId
        );
        console.log('Investimento de tempo criado:', { hours: hours.toFixed(2), amount: (hours * sess.hourlyRate).toFixed(2), sessionId });
      }
    } catch (error) {
      console.error('Erro ao parar sessão ou criar investimento:', error);
      alert('Ocorreu um erro ao finalizar a sessão. Verifique o console para mais detalhes.');
    }
  };

  const getCurrentTimeSession = () =>
    user
      ? timeSessions.find(s => s.userId === user.id && !s.isCompleted) || null
      : null;

  const updateTimeSession = async (id: string, data: Partial<TimeSession>) => {
    if (!user) return;
    try {
      // Obter a sessão atual antes da atualização
      const sessionBeforeUpdate = timeSessions.find(s => s.id === id);
      if (!sessionBeforeUpdate) {
        console.error('Sessão não encontrada:', { sessionId: id });
        return;
      }

      // Atualizar a sessão no Firestore
      await updateDoc(doc(db, 'timeSessions', id), data);
      console.log('Sessão atualizada:', { sessionId: id, updatedData: data });

      // Verificar se a sessão está completa e se o tipo (isPaid) mudou
      const isPaidAfterUpdate = data.isPaid !== undefined ? data.isPaid : sessionBeforeUpdate.isPaid;
      const endTime = data.endTime !== undefined ? data.endTime : sessionBeforeUpdate.endTime;
      const startTime = data.startTime !== undefined ? data.startTime : sessionBeforeUpdate.startTime;
      const hourlyRate = data.hourlyRate !== undefined ? data.hourlyRate : sessionBeforeUpdate.hourlyRate;
      const pausedTime = data.pausedTime !== undefined ? data.pausedTime : sessionBeforeUpdate.pausedTime;

      if (endTime) {
        const hours =
          Math.round(((new Date(endTime).getTime() - new Date(startTime).getTime() - pausedTime) / 3600000) * 100) / 100;
        const amount = Math.round(hours * hourlyRate * 100) / 100;

        const investment = investments.find(i => i.sessionId === id && i.isTimeInvestment);

        // Caso 1: Mudou de "Pago" para "Investido"
        if (sessionBeforeUpdate.isPaid && !isPaidAfterUpdate) {
          await addInvestment(
            `Investimento de Tempo (${hours.toFixed(2)}h)`,
            amount,
            true,
            id
          );
          console.log('Novo investimento criado:', { sessionId: id, amount: amount.toFixed(2) });
        }
        // Caso 2: Mudou de "Investido" para "Pago"
        else if (!sessionBeforeUpdate.isPaid && isPaidAfterUpdate && investment) {
          await deleteInvestment(investment.id);
          console.log('Investimento removido:', { investmentId: investment.id });
        }
        // Caso 3: Permanece como "Investido", apenas atualizar o investimento existente
        else if (!isPaidAfterUpdate && investment) {
          await updateInvestment(investment.id, {
            description: `Investimento de Tempo (${hours.toFixed(2)}h)`,
            amount: amount
          });
          console.log('Investimento atualizado:', { sessionId: id, newAmount: amount.toFixed(2) });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar sessão ou investimento:', error);
    }
  };

  const deleteTimeSession = async (id: string) => {
    if (!user) return;
    try {
      // Deletar o investimento associado, se existir
      const investment = investments.find(i => i.sessionId === id && i.isTimeInvestment);
      if (investment) {
        await deleteInvestment(investment.id);
        console.log('Investimento associado deletado:', { investmentId: investment.id });
      }
      await deleteDoc(doc(db, 'timeSessions', id));
      console.log('Sessão deletada:', { sessionId: id });
    } catch (error) {
      console.error('Erro ao deletar sessão ou investimento:', error);
    }
  };

  const addDebt = async (d: Omit<Debt, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'debts'), d);
  };

  const updateDebt = (id: string, data: Partial<Debt>) =>
    updateDoc(doc(db, 'debts', id), data);

  const deleteDebt = (id: string) =>
    deleteDoc(doc(db, 'debts', id));

  const markDebtAsPaid = (id: string) =>
    updateDoc(doc(db, 'debts', id), { paid: true });

  const markDebtAsUnpaid = (id: string) =>
    updateDoc(doc(db, 'debts', id), { paid: false });

  const addProduct = async (
    p: Omit<Product, 'id' | 'seq' | 'salePrice' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
  ) => {
    if (!user) return;
    await runTransaction(db, async tx => {
      const counterRef = doc(db, 'counters', 'products');
      const counterSnap = await tx.get(counterRef);
      const lastSeq: number = (counterSnap.exists() && (counterSnap.data() as any).lastSeq) || 0;
      const newSeq = lastSeq + 1;
      tx.set(counterRef, { lastSeq: newSeq }, { merge: true });

      const now = new Date().toISOString();
      const salePrice = p.costPrice * (1 + p.profitMargin / 100);
      const prodRef = doc(collection(db, 'products')) as DocumentReference<Product>;

      tx.set(prodRef, {
        id: prodRef.id,
        seq: newSeq,
        description: p.description,
        costPrice: p.costPrice,
        profitMargin: p.profitMargin,
        salePrice,
        quantity: (p as any).quantity,
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

  const deleteProduct = (id: string) =>
    deleteDoc(doc(db, 'products', id));

  const searchProducts = async (term: string): Promise<Product[]> => {
    const bySeq = products.find(p => p.seq.toString() === term);
    if (bySeq) return [bySeq];
    const q = query(
      collection(db, 'products'),
      where('description', '>=', term),
      where('description', '<=', term + '\uf8ff')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...(d.data() as any), id: d.id }));
  };

  const getTotalProductValue = () =>
    products.reduce((sum, p) => sum + p.salePrice * p.quantity, 0);

  const addSale = async (
    s: Omit<Sale, 'id' | 'seq' | 'soldAt' | 'soldBy' | 'canceled'>
  ) => {
    if (!user) return;
    await runTransaction(db, async tx => {
      const counterRef = doc(db, 'counters', 'vendas');
      const counterSnap = await tx.get(counterRef);
      const lastSeq: number = (counterSnap.exists() && (counterSnap.data() as any).lastSeq) || 0;

      const prodRef = doc(db, 'products', s.productId);
      const prodSnap = await tx.get(prodRef);
      const curQty: number = (prodSnap.exists() && (prodSnap.data() as any).quantity) || 0;

      const newSeq = lastSeq + 1;
      tx.set(counterRef, { lastSeq: newSeq }, { merge: true });

      const now = new Date().toISOString();
      const saleRef = doc(collection(db, 'vendas')) as DocumentReference<Sale>;
      tx.set(saleRef, {
        id: saleRef.id,
        seq: newSeq,
        productId: s.productId,
        description: s.description,
        unitPrice: s.unitPrice,
        discountPercent: s.discountPercent,
        finalUnitPrice: s.finalUnitPrice,
        quantity: s.quantity,
        totalPrice: s.totalPrice,
        soldAt: now,
        soldBy: user.id,
        canceled: false
      });

      const newQty = curQty - s.quantity;
      tx.update(prodRef, { quantity: newQty });
    });
  };

  const undoSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    try {
      await runTransaction(db, async tx => {
        const saleRef = doc(db, 'vendas', id);
        const saleSnap = await tx.get(saleRef);
        if (!saleSnap.exists()) {
          return;
        }

        const sale = saleSnap.data() as Sale;
        const prodRef = doc(db, 'products', sale.productId);
        const prodSnap = await tx.get(prodRef);

        tx.delete(saleRef);

        if (prodSnap.exists()) {
          const curQty: number = prodSnap.data().quantity || 0;
          const newQty = curQty + sale.quantity;
          tx.update(prodRef, { quantity: newQty });
        } else {
          const now = new Date().toISOString();
          tx.set(prodRef, {
            id: sale.productId,
            seq: 0,
            description: sale.description,
            costPrice: 0,
            profitMargin: 0,
            salePrice: sale.finalUnitPrice,
            quantity: sale.quantity,
            createdAt: now,
            createdBy: user.id
          });
        }
      });
    } catch (error) {
      throw new Error(`Failed to delete sale: ${(error as any).message}`);
    }
  };

  const getSales = async (opts?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
    userId?: string;
    includeCanceled?: boolean;
  }) => {
    const clauses: any[] = [];
    if (opts?.productId) clauses.push(where('productId', '==', opts.productId));
    if (opts?.userId) clauses.push(where('soldBy', '==', opts.userId));
    if (!opts?.includeCanceled) clauses.push(where('canceled', '==', false));
    if (opts?.startDate) clauses.push(where('soldAt', '>=', opts.startDate));
    if (opts?.endDate) clauses.push(where('soldAt', '<=', opts.endDate));

    let q: any = collection(db, 'vendas');
    if (clauses.length) q = query(collection(db, 'vendas'), ...clauses);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...(d.data() as any), id: d.id }));
  };

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
        updateTimeSession,
        deleteTimeSession,

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
        getTotalProductValue,

        sales,
        addSale,
        undoSale,
        getSales
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;