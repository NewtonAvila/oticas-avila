import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  collection,
  getDoc,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  role?: string; // Novo campo opcional para role
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    password: string,
    role?: string
  ) => Promise<boolean>;
  logout: () => void;
  resetPassword: (username: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<boolean>;
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
        isAdmin: true,
        role: 'admin'
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
            isAdmin: userData.isAdmin || false,
            role: userData.role || 'partner' // Padrão para compatibilidade
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

  const register = async (
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    password: string,
    role: string = 'partner' // Padrão como sócio, pode ser sobrescrito
  ): Promise<boolean> => {
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
        isAdmin: false,
        role
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

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (!user?.isAdmin) {
      setError('Permissão negada');
      return false;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch {
      setError('Erro ao deletar usuário');
      return false;
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    if (!user?.isAdmin) {
      setError('Permissão negada');
      return false;
    }

    try {
      await updateDoc(doc(db, 'users', userId), userData);
      return true;
    } catch {
      setError('Erro ao atualizar usuário');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const resetPassword = async (username: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log(`Instruções de redefinição enviadas para ${username}`);
        return true;
      } else {
        setError('Usuário não encontrado');
        return false;
      }
    } catch {
      setError('Erro ao tentar redefinir senha');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        resetPassword,
        deleteUser,
        updateUser,
        loading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};