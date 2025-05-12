import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useData, Product } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Edit, Trash } from 'lucide-react';

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
  const [quantity, setQuantity] = useState('');
  const [filter, setFilter] = useState('');
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<{ id: string; description: string; costPrice: string; profitMargin: string; quantity: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const term = filter.trim().toLowerCase();
      setFiltered(
        Array.isArray(products)
          ? products.filter(p =>
              p && (p.description.toLowerCase().includes(term) || p.seq?.toString().includes(term))
            )
          : []
      );
    } catch (err) {
      setError('Erro ao carregar produtos.');
      console.error('Erro ao filtrar produtos:', err);
    } finally {
      setLoading(false);
    }
  }, [products, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description || !costPrice || !profitMargin || !quantity) return;
    const cp = parseFloat(costPrice);
    const pm = parseFloat(profitMargin);
    const qt = parseInt(quantity, 10);
    if (isNaN(cp) || isNaN(pm) || isNaN(qt)) return;

    try {
      await addProduct({
        description,
        costPrice: cp,
        profitMargin: pm,
        quantity: qt
      });
      setDescription('');
      setCostPrice('');
      setProfitMargin('');
      setQuantity('');
    } catch (err) {
      setError('Erro ao cadastrar produto.');
      console.error('Erro ao cadastrar produto:', err);
    }
  };

  const handleEditRow = (id: string, description: string, costPrice: number, profitMargin: number, quantity: number) => {
    setEditProduct({
      id,
      description,
      costPrice: costPrice.toString(),
      profitMargin: profitMargin.toString(),
      quantity: quantity.toString()
    });
  };

  const handleSaveRow = async () => {
    if (editProduct) {
      const cp = parseFloat(editProduct.costPrice);
      const pm = parseFloat(editProduct.profitMargin);
      const qt = parseInt(editProduct.quantity, 10);
      if (!editProduct.description.trim() || isNaN(cp) || isNaN(pm) || isNaN(qt)) {
        alert('Por favor, preencha todos os campos com valores válidos.');
        return;
      }
      try {
        await updateProduct(editProduct.id, {
          description: editProduct.description,
          costPrice: cp,
          profitMargin: pm,
          quantity: qt
        });
        setEditProduct(null);
      } catch (err) {
        setError('Erro ao atualizar produto.');
        console.error('Erro ao atualizar produto:', err);
      }
    }
  };

  const handleCancelRow = () => {
    setEditProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Confirma exclusão deste produto?')) {
      try {
        await deleteProduct(id);
      } catch (err) {
        setError('Erro ao excluir produto.');
        console.error('Erro ao excluir produto:', err);
      }
    }
  };

  if (!user) return null;

  if (loading) return <div className="text-center p-6">Carregando...</div>;
  if (error) return <div className="text-center p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Cadastro de Produtos" showBackButton />
      <main className="container mx-auto p-6 grid md:grid-cols-3 gap-6">
        <section className="md:col-span-3 bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Total em Estoque</h2>
          <p className="text-2xl font-bold">
            {formatCurrency(getTotalProductValue ? getTotalProductValue() : 0)}
          </p>
        </section>

        <section className="md:col-span-2 bg-white dark:bg-gray-800 rounded shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Produtos</h2>
            <input
              type="text"
              placeholder="Filtrar por descrição ou seq"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="input-field w-1/3 md:w-1/4 sm:w-full"
            />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.isArray(filtered) && filtered.length > 0 ? (
              filtered.map(p => {
                const isEditing = editProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className="border-b py-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-8 gap-2 items-center">
                      <div className="text-xs text-gray-500 sm:col-span-1">{p.seq}</div>
                      {isEditing && editProduct ? (
                        <>
                          <input
                            value={editProduct.description}
                            onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                            className="input-field col-span-2 sm:col-span-1"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editProduct.costPrice}
                            onChange={(e) => setEditProduct({ ...editProduct, costPrice: e.target.value })}
                            className="input-field col-span-1 sm:col-span-1"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={editProduct.profitMargin}
                            onChange={(e) => setEditProduct({ ...editProduct, profitMargin: e.target.value })}
                            className="input-field col-span-1 sm:col-span-1"
                          />
                          <input
                            type="number"
                            step="1"
                            value={editProduct.quantity}
                            onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                            className="input-field col-span-1 sm:col-span-1"
                          />
                        </>
                      ) : (
                        <>
                          <div className="col-span-2 sm:col-span-1">{p.description}</div>
                          <div className="col-span-1 sm:col-span-1">{p.costPrice.toFixed(2)}</div>
                          <div className="col-span-1 sm:col-span-1">{p.profitMargin.toFixed(1)}</div>
                          <div className="col-span-1 sm:col-span-1">{p.quantity}</div>
                        </>
                      )}
                      <div className="font-medium sm:col-span-1">
                        {formatCurrency(p.salePrice)}
                      </div>
                      <div className="flex justify-end gap-2 sm:col-span-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveRow}
                              className="btn-primary px-2 py-1 text-sm"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={handleCancelRow}
                              className="btn-outline px-2 py-1 text-sm"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditRow(p.id, p.description, p.costPrice, p.profitMargin, p.quantity)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm italic">Nenhum produto encontrado.</p>
            )}
          </div>
        </section>

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
            <div>
              <label className="block mb-1 text-sm">Quantidade</label>
              <input
                type="number"
                step="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
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