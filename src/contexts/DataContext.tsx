import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
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

type DataContextType = {
  investments: Investment[];
  timeSessions: TimeSession[];
  debts: Debt[];
  addInvestment: (description: string, amount: number, isTimeInvestment?: boolean) => void;
  updateInvestment: (id: string, data: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  getTotalInvestment: () => number;
  getUserInvestmentPercentage: () => number;
  getUserContributionAmount: () => number;
  getAllUsersInvestmentData: () => Array<{ name: string; amount: number; percentage: number }>;
  startTimeSession: (hourlyRate: number) => string;
  stopTimeSession: (sessionId: string, isPaid: boolean) => void;
  getCurrentTimeSession: () => TimeSession | null;

  // Débitos
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  markDebtAsPaid: (id: string) => void;
  markDebtAsUnpaid: (id: string) => void;
};

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    const unsubscribeInvestments = onSnapshot(collection(db, 'investments'), snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Investment));
      setInvestments(data);
    });

    const unsubscribeSessions = onSnapshot(collection(db, 'timeSessions'), snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeSession));
      setTimeSessions(data);
    });

    const unsubscribeDebts = onSnapshot(collection(db, 'debts'), snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Debt));
      setDebts(data);
    });

    return () => {
      unsubscribeInvestments();
      unsubscribeSessions();
      unsubscribeDebts();
    };
  }, []);

  const addInvestment = async (description: string, amount: number, isTimeInvestment: boolean = false) => {
    if (!user) return;

    const investment: Omit<Investment, 'id'> = {
      description,
      amount,
      userId: user.id,
      userName: user.username,
      date: new Date().toISOString(),
      isTimeInvestment
    };

    await addDoc(collection(db, 'investments'), investment);
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    await updateDoc(doc(db, 'investments', id), data);
  };

  const deleteInvestment = async (id: string) => {
    await deleteDoc(doc(db, 'investments', id));
  };

  const getTotalInvestment = () => {
    return investments.reduce((acc, inv) => acc + inv.amount, 0);
  };

  const getUserContributionAmount = () => {
    if (!user) return 0;
    return investments.filter(i => i.userId === user.id).reduce((acc, i) => acc + i.amount, 0);
  };

  const getUserInvestmentPercentage = () => {
    const total = getTotalInvestment();
    const userTotal = getUserContributionAmount();
    return total > 0 ? (userTotal / total) * 100 : 0;
  };

  const getAllUsersInvestmentData = () => {
    const totals: Record<string, { name: string; amount: number }> = {};

    investments.forEach(inv => {
      if (!totals[inv.userId]) {
        totals[inv.userId] = { name: inv.userName, amount: 0 };
      }
      totals[inv.userId].amount += inv.amount;
    });

    const total = getTotalInvestment();
    return Object.values(totals).map(u => ({
      name: u.name,
      amount: u.amount,
      percentage: total > 0 ? (u.amount / total) * 100 : 0
    }));
  };

  const startTimeSession = (hourlyRate: number): string => {
    if (!user) return '';

    const session: Omit<TimeSession, 'id'> = {
      userId: user.id,
      startTime: new Date().toISOString(),
      endTime: null,
      pausedTime: 0,
      hourlyRate,
      isPaid: false,
      isCompleted: false
    };

    const newDocRef = doc(collection(db, 'timeSessions'));
    const sessionId = newDocRef.id;

    addDoc(collection(db, 'timeSessions'), { ...session, id: sessionId });
    return sessionId;
  };

  const stopTimeSession = async (sessionId: string, isPaid: boolean) => {
    const session = timeSessions.find(s => s.id === sessionId);
    if (!session || !user) return;

    const endTime = new Date().toISOString();
    const updatedSession = { ...session, endTime, isPaid, isCompleted: true };

    await updateDoc(doc(db, 'timeSessions', sessionId), updatedSession);

    if (!isPaid) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(endTime).getTime();
      const duration = (end - start - session.pausedTime) / (1000 * 60 * 60);
      const amount = duration * session.hourlyRate;
      await addInvestment(`Investimento de Tempo (${duration.toFixed(2)}h)`, amount, true);
    }
  };

  const getCurrentTimeSession = (): TimeSession | null => {
    if (!user) return null;
    return timeSessions.find(s => s.userId === user.id && !s.isCompleted) || null;
  };

  const addDebt = async (debt: Omit<Debt, 'id'>) => {
    await addDoc(collection(db, 'debts'), debt);
  };

  const markDebtAsPaid = async (id: string) => {
    await updateDoc(doc(db, 'debts', id), { paid: true });
  };

  const markDebtAsUnpaid = async (id: string) => {
    await updateDoc(doc(db, 'debts', id), { paid: false });
  };

  return (
    <DataContext.Provider
      value={{
        investments,
        timeSessions,
        debts,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        getTotalInvestment,
        getUserInvestmentPercentage,
        getUserContributionAmount,
        startTimeSession,
        stopTimeSession,
        getCurrentTimeSession,
        getAllUsersInvestmentData,
        addDebt,
        markDebtAsPaid,
        markDebtAsUnpaid
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
