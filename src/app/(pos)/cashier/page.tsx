'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Wallet,
  ArrowLeft, Barcode, User, Loader2, X, Package,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  basePrice: number;
  imageUrl: string | null;
  category: string | null;
  _stockQty: number;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'MOBILE', label: 'Mobile', icon: Wallet },
];

export default function CashierPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    Promise.all([
      Promise.all([
        api.get('/products?limit=1000'),
        api.get('/products/stock').catch(() => ({ data: [] })),
      ]).then(([prodRes, stockRes]) => {
        const prods = prodRes.data.products || prodRes.data;
        const stockMap: Record<number, number> = {};
        if (Array.isArray(stockRes.data)) {
          for (const s of stockRes.data) {
            stockMap[s.productId] = (stockMap[s.productId] || 0) + Number(s.qty);
          }
        }
        const enriched = prods.map((p: Product) => ({ ...p, _stockQty: stockMap[p.id] ?? 0 }));
        setProducts(enriched);
        const cats = [...new Set(enriched.map((p: Product) => p.category).filter(Boolean))] as string[];
        setCategories(cats);
      }),
      api.get('/customers').catch(() => ({ data: [] })),
    ])
      .then(([, custRes]) => {
        if (custRes?.data) setCustomers(custRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, search, activeCategory]);

  const addToCart = useCallback((product: Product) => {
    const stock = product._stockQty;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (stock <= 0) {
        toast.error('Out of stock');
        return prev;
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.basePrice),
        quantity: 1,
        maxStock: stock,
      }];
    });
  }, []);

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.maxStock) { toast.error('Not enough stock'); return i; }
          return { ...i, quantity: newQty };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = 0;
  const total = subtotal + tax;
  const change = Number(amountPaid) - total;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const storeId = user?.storeId;
      const items = cart.map((i) => ({
        productId: i.productId,
        qty: i.quantity,
        unitPrice: i.price,
        discount: 0,
        taxAmount: 0,
        lineTotal: i.price * i.quantity,
      }));
      const payload = {
        storeId,
        items,
        subtotal,
        total,
        discountAmount: 0,
        taxAmount: 0,
        payments: [{ method: paymentMethod, amount: paymentMethod === 'CASH' ? Number(amountPaid) : total }],
        customerId: selectedCustomer?.id || null,
      };
      const { data } = await api.post('/sales', payload);
      toast.success(`Sale completed! Receipt: ${data.receiptNo}`);
      window.open(`/sales/receipt/${data.id}`, '_blank');
      setCart([]);
      setSelectedCustomer(null);
      setAmountPaid('');
      setShowCheckout(false);
    } catch {
      toast.error('Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = company?.settings?.primaryColor || '#3B82F6';

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA]">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
        <button onClick={() => router.push('/overview')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Point of Sale</h1>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">{user?.name} — {user?.store?.name || 'Store'}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Product grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search + categories */}
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim() !== '') {
                    const match = products.find(p => p.barcode === search.trim() || p.sku === search.trim());
                    if (match) {
                      addToCart(match);
                      setSearch('');
                    } else if (filtered.length === 1) {
                      addToCart(filtered[0]);
                      setSearch('');
                    } else {
                      toast.error('Barcode not found');
                    }
                  }
                }}
                placeholder="Scan barcode or type name..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory('All')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition',
                  activeCategory === 'All'
                    ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
                style={activeCategory === 'All' ? { backgroundColor: primaryColor } : undefined}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition',
                    activeCategory === cat
                      ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                  style={activeCategory === cat ? { backgroundColor: primaryColor } : undefined}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">Loading products...</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400">No products found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((product) => {
                  const stock = product._stockQty;
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={cn(
                        'bg-white border rounded-lg p-3 text-left hover:shadow-md transition relative',
                        inCart ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200',
                        stock <= 0 && 'opacity-50',
                      )}
                    >
                      {inCart && (
                        <span
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {inCart.quantity}
                        </span>
                      )}
                      <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain rounded" />
                        ) : (
                          <Package size={24} className="text-gray-300" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.sku}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-sm font-bold" style={{ color: primaryColor }}>
                          ${Number(product.basePrice).toFixed(2)}
                        </p>
                        <span className={cn(
                          'text-xs',
                          stock <= 5 ? 'text-red-500' : 'text-gray-400',
                        )}>
                          {stock} in stock
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {!showCheckout ? (
            <>
              {/* Cart header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-gray-600" />
                <h2 className="font-semibold text-gray-900">Cart</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </div>

              {/* Customer select */}
              <div className="px-4 py-2 border-b border-gray-100">
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedCustomer(customers.find((c) => c.id === id) || null);
                  }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ShoppingCart size={40} className="mb-2 opacity-30" />
                    <p className="text-sm">Cart is empty</p>
                    <p className="text-xs">Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="px-4 py-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 ml-2">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.productId, -1)}
                            className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.productId, 1)}
                            className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart footer */}
              <div className="border-t border-gray-200 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm transition disabled:opacity-40"
                  style={{ backgroundColor: primaryColor }}
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          ) : (
            /* Checkout panel */
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <button onClick={() => setShowCheckout(false)} className="text-gray-500 hover:text-gray-700">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-semibold text-gray-900">Checkout</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Order summary */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Summary</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {cart.map((i) => (
                      <div key={i.productId} className="flex justify-between text-sm">
                        <span className="text-gray-600">{i.name} × {i.quantity}</span>
                        <span className="font-medium">${(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition',
                          paymentMethod === m.value
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        <m.icon size={20} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount paid (cash only) */}
                {paymentMethod === 'CASH' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount Received</p>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={`Min $${total.toFixed(2)}`}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {Number(amountPaid) >= total && (
                      <p className="text-green-600 text-sm font-semibold mt-2">
                        Change: ${change.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{selectedCustomer.name}</p>
                      <p className="text-xs text-gray-400">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleCheckout}
                  disabled={submitting || (paymentMethod === 'CASH' && Number(amountPaid) < total)}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Processing...' : `Complete Sale — $${total.toFixed(2)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
