import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 🌙 Aplica o tema salvo no localStorage
const savedTheme = localStorage.getItem('theme');
const isDarkTheme = savedTheme === 'dark';
if (isDarkTheme) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);