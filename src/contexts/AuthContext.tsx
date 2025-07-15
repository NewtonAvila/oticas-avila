import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionUser = localStorage.getItem('user');
    if (sessionUser) {
      setUser(JSON.parse(sessionUser));
    }
    setLoading(false);
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('username', '==', 'admin'));
    const snapshot = await getDocs(adminQuery);

    if (snapshot.empty) {
      const adminUser: User & { password: string } = {
        id: 'admin_user',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Administrador',
        lastName: '',
        password: 'admin',
      };
      await setDoc(doc(usersRef, adminUser.id), adminUser);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const userData = docSnap.data() as User & { password: string };

        if (userData.password === password) {
          const userObj: User = {
            id: docSnap.id,
            username: userData.username,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
          };
          localStorage.setItem('user', JSON.stringify(userObj));
          setUser(userObj);
          return true;
        } else {
          setError('Senha incorreta');
        }
      } else {
        setError('Usuário não encontrado');
      }
      return false;
    } catch {
      setError('Erro ao fazer login');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, username: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError('Nome de usuário já está em uso');
        return false;
      }

      const newUser: User & { password: string } = {
        id: `user_${Date.now()}`,
        username,
        email,
        firstName,
        lastName,
        password,
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      const { password: _, ...userWithoutPassword } = newUser;
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      return true;
    } catch {
      setError('Erro ao registrar usuário');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};