// src/pages/RegisterProduct.tsx
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';

const RegisterProduct: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    getTotalProductValue,
  } = useData();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [filter, setFilter] = useState('');
  const [filtered, setFiltered] = useState(products);

  // Recalcula a lista filtrada sempre que products ou filter mudam
  useEffect(() => {
    const term = filter.trim().toLowerCase();
    setFiltered(
      products.filter(p =>
        p.description.toLowerCase().includes(term) ||
        p.seq.toString().includes(term)
      )
    );
  }, [products, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description || !costPrice || !profitMargin) return;

    const cp = parseFloat(costPrice);
    const pm = parseFloat(profitMargin);
    if (isNaN(cp) || isNaN(pm)) return;

    await addProduct({
      description,
      costPrice: cp,
      profitMargin: pm
    });

    setDescription('');
    setCostPrice('');
    setProfitMargin('');
  };

  const handleUpdate = async (
    id: string,
    field: 'description' | 'costPrice' | 'profitMargin',
    value: string
  ) => {
    const data: Partial<any> = {};
    if (field === 'description') {
      data.description = value;
    } else if (field === 'costPrice') {
      const cp = parseFloat(value);
      if (isNaN(cp)) return;
      data.costPrice = cp;
    } else if (field === 'profitMargin') {
      const pm = parseFloat(value);
      if (isNaN(pm)) return;
      data.profitMargin = pm;
    }
    await updateProduct(id, data);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Confirma exclusão deste produto?')) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Cadastro de Produtos" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-3 gap-6">

        {/* Total em Estoque */}
        <section className="md:col-span-3 bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Total em Estoque</h2>
          <p className="text-2xl font-bold">
            {formatCurrency(getTotalProductValue())}
          </p>
        </section>

        {/* Lista & filtro */}
        <section className="md:col-span-2 bg-white dark:bg-gray-800 rounded shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Produtos</h2>
            <input
              type="text"
              placeholder="Filtrar por descrição ou seq"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="input-field w-1/3"
            />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filtered.map(p => (
              <div
                key={p.id}
                className="grid grid-cols-6 gap-2 items-center border-b py-2"
              >
                {/* Mostra o seq em vez do id do Firestore */}
                <div className="col-span-1 text-xs text-gray-500">{p.seq}</div>

                <input
                  defaultValue={p.description}
                  onBlur={e =>
                    handleUpdate(p.id, 'description', e.target.value)
                  }
                  className="input-field col-span-2"
                />

                <input
                  defaultValue={p.costPrice.toString()}
                  onBlur={e =>
                    handleUpdate(p.id, 'costPrice', e.target.value)
                  }
                  className="input-field col-span-1"
                />

                <input
                  defaultValue={p.profitMargin.toString()}
                  onBlur={e =>
                    handleUpdate(p.id, 'profitMargin', e.target.value)
                  }
                  className="input-field col-span-1"
                />

                <div className="col-span-1 font-medium">
                  {formatCurrency(p.salePrice)}
                </div>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Excluir
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm italic">
                Nenhum produto encontrado.
              </p>
            )}
          </div>
        </section>

        {/* Formulário de novo produto */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Novo Produto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">Preço de Compra (R$)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">% Lucro (ex: 20 para 20%)</label>
              <input
                type="number"
                step="0.1"
                value={profitMargin}
                onChange={e => setProfitMargin(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Cadastrar Produto
            </button>
          </form>
        </section>

      </main>
    </div>
  );
};

export default RegisterProduct;
