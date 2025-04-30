import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formatar valor monetário para BRL
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatar datas para exibição
export const formatDate = (date: string): string => {
  return format(new Date(date), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
};
