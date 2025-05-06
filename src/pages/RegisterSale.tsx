import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useData, Product, Sale } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';

const RegisterSale: React.FC = () => {
  const { products, addSale, undoSale, sales } = useData();
  const { user } = useAuth();

  const [filterTerm, setFilterTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  useEffect(() => {
    const term = filterTerm.trim().toLowerCase();
    setFilteredProducts(
      products.filter(p =>
        p.quantity > 0 &&
        (p.description.toLowerCase().includes(term) || p.seq.toString().includes(term))
      )
    );
  }, [products, filterTerm]);

  useEffect(() => {
    setDiscountPercent(0);
    setQuantity(1);
    if (selectedProduct) {
      const updatedProduct = products.find(p => p.id === selectedProduct.id);
      if (!updatedProduct || updatedProduct.quantity <= 0) {
        setSelectedProduct(null);
      } else {
        setSelectedProduct(updatedProduct);
      }
    }
  }, [products, selectedProduct]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || selectedProduct.quantity <= 0 || quantity <= 0) return;

    setLoading(true);
    setError(null);

    const unitPrice = selectedProduct.salePrice;
    const finalUnitPrice = unitPrice * (1 - discountPercent / 100);
    const totalPrice = finalUnitPrice * quantity;

    try {
      await addSale({
        productId: selectedProduct.id,
        description: selectedProduct.description,
        unitPrice,
        discountPercent,
        finalUnitPrice,
        quantity,
        totalPrice
      });
      setSelectedProduct(null);
      setFilterTerm('');
      setDiscountPercent(0);
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar venda. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (deletingSaleId) return; // Prevent multiple clicks
    setDeletingSaleId(id);
    setError(null);
    try {
      await undoSale(id);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir venda. Tente novamente.');
    } finally {
      setDeletingSaleId(null);
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(0, Number(e.target.value)));
    setDiscountPercent(value);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(selectedProduct?.quantity || 0, Math.max(1, Number(e.target.value)));
    setQuantity(value);
  };

  const recentSales = sales
    .filter(s => {
      const soldDate = new Date(s.soldAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return soldDate >= sevenDaysAgo;
    })
    .sort((a, b) => b.seq - a.seq);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header title="Registro de Vendas" showBackButton />

      <main className="container mx-auto p-6 grid md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Nova Venda</h2>

          {error && (
            <p className="text-red-600 font-semibold">{error}</p>
          )}

          <div>
            <label className="block mb-1 text-sm">Buscar Produto (por seq ou descrição)</label>
            <input
              type="text"
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
              className="w-full input-field"
              placeholder="Digite seq ou parte da descrição"
              disabled={loading}
            />
            {filterTerm && !selectedProduct && (
              <ul className="border rounded mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-700">
                {filteredProducts.map(p => (
                  <li
                    key={p.id}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(p);
                      setFilterTerm('');
                    }}
                  >
                    #{p.seq} — {p.description} (Estoque: {p.quantity})
                  </li>
                ))}
                {filteredProducts.length === 0 && (
                  <li className="px-3 py-2 text-gray-500">Nenhum produto disponível</li>
                )}
              </ul>
            )}
          </div>

          {selectedProduct && (
            <form onSubmit={handleSubmit}>
              {selectedProduct.quantity <= 0 ? (
                <p className="text-red-600 font-semibold">Produto não disponível</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <p><span className="font-semibold">Descrição:</span> {selectedProduct.description}</p>
                    <p><span className="font-semibold">Seq:</span> {selectedProduct.seq}</p>
                    <p><span className="font-semibold">Estoque:</span> {selectedProduct.quantity}</p>
                    <p><span className="font-semibold">Preço Unitário:</span> {formatCurrency(selectedProduct.salePrice)}</p>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm">% Desconto</label>
                    <input
                      type="number"
                      className="w-full input-field"
                      value={discountPercent}
                      min={0}
                      max={100}
                      onChange={handleDiscountChange}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm">Quantidade</label>
                    <input
                      type="number"
                      className="w-full input-field"
                      value={quantity}
                      min={1}
                      max={selectedProduct.quantity}
                      onChange={handleQuantityChange}
                      disabled={loading}
                    />
                  </div>

                  <p className="font-semibold">
                    Valor Final: {formatCurrency(selectedProduct.salePrice * (1 - discountPercent / 100))}
                    {' '}× {quantity} ={' '}
                    {formatCurrency(selectedProduct.salePrice * (1 - discountPercent / 100) * quantity)}
                  </p>

                  <button
                    type="submit"
                    className={`w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={selectedProduct.quantity <= 0 || loading}
                  >
                    {loading ? 'Registrando...' : 'Registrar Venda'}
                  </button>
                </>
              )}
            </form>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Vendas Últimos 7 Dias</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {recentSales.map(s => (
              <div
                key={s.id}
                className="p-3 rounded border flex justify-between items-center bg-blue-50 dark:bg-blue-100 dark:text-gray-900"
              >
                <div>
                  <p className="font-medium">#{s.seq} — {s.description}</p>
                  <p className="text-sm">
                    {new Date(s.soldAt).toLocaleDateString()} — {s.quantity}×{formatCurrency(s.finalUnitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(s.totalPrice)}</p>
                  <button
                    onClick={() => handleDeleteSale(s.id)}
                    className="text-sm text-red-600 underline mt-1"
                    disabled={deletingSaleId === s.id}
                  >
                    {deletingSaleId === s.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-gray-500 text-sm italic">Nenhuma venda recente.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default RegisterSale;