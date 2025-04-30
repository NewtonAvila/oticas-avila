import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
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

type DataContextType = {
  investments: Investment[];
  timeSessions: TimeSession[];
  addInvestment: (description: string, amount: number, isTimeInvestment?: boolean) => void;
  updateInvestment: (id: string, data: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  getTotalInvestment: () => number;
  getUserInvestmentPercentage: () => number;
  startTimeSession: (hourlyRate: number) => string;
  stopTimeSession: (sessionId: string, isPaid: boolean) => void;
  getCurrentTimeSession: () => TimeSession | null;
  getAllUsersInvestmentData: () => Array<{ name: string; amount: number; percentage: number }>;
};

const DataContext = createContext<DataContextType>({} as DataContextType);
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);

  useEffect(() => {
    if (!user) return;
  
    const investmentsRef = collection(db, 'investments');
    const timeSessionsRef = collection(db, 'timeSessions');
  
    const unsubscribeInvestments = onSnapshot(investmentsRef, snapshot => {
      const data = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Investment))
        .filter(inv => user.isAdmin || inv.userId === user.id);
      setInvestments(data);
    });
  
    const unsubscribeSessions = onSnapshot(timeSessionsRef, snapshot => {
      const data = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as TimeSession))
        .filter(session => user.isAdmin || session.userId === user.id);
      setTimeSessions(data);
    });
  
    return () => {
      unsubscribeInvestments();
      unsubscribeSessions();
    };
  }, [user]);
  

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

  const getUserInvestmentPercentage = () => {
    if (!user) return 0;
  
    if (user.isAdmin) return 100;
  
    const total = getTotalInvestment();
    const userTotal = investments
      .filter(i => i.userId === user.id)
      .reduce((acc, i) => acc + i.amount, 0);
  
    return total > 0 ? (userTotal / total) * 100 : 0;
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

  const value: DataContextType = {
    investments,
    timeSessions,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    getTotalInvestment,
    getUserInvestmentPercentage,
    startTimeSession,
    stopTimeSession,
    getCurrentTimeSession,
    getAllUsersInvestmentData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
