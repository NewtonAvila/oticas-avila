import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext'; // ✅ Suporte ao modo escuro
import AppRoutes from './Router';

const App: React.FC = () => {
  return (
    <ThemeProvider> {/* ✅ Aplica tema escuro ou claro */}
      <AuthProvider> {/* ✅ Autenticação */}
        <DataProvider> {/* ✅ Investimentos e sessões de tempo */}
          <LanguageProvider> {/* ✅ Suporte multilíngue (se aplicável) */}
            <AppRoutes /> {/* ✅ Rotas da aplicação */}
          </LanguageProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;