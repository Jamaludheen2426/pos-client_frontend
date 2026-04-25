'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Wallet,
  ArrowLeft, Loader2, Package, ChevronDown, UserCircle, X,
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
  { value: 'UPI', label: 'UPI', icon: Wallet },
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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    Promise.all([
      Promise.all([
        api.get('/products?limit=1000'),
        api.get(`/products/stock${user?.storeId ? `?storeId=${user.storeId}` : ''}`).catch(() => ({ data: [] })),
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
  }, [user?.storeId]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') list = list.filter((p) => p.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, search, activeCategory]);

  const addToCart = useCallback((product: Product) => {
    const stock = product._stockQty;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) { toast.error('Not enough stock'); return prev; }
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (stock <= 0) { toast.error('Out of stock'); return prev; }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.basePrice), quantity: 1, maxStock: stock }];
    });
  }, []);

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty > i.maxStock) { toast.error('Not enough stock'); return i; }
        return { ...i, quantity: newQty };
      }).filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: number) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = 0;
  const total = subtotal + tax;
  const change = Number(amountPaid) - total;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const storeId = user?.storeId;
      const items = cart.map((i) => ({
        productId: i.productId, qty: i.quantity, unitPrice: i.price,
        discount: 0, taxAmount: 0, lineTotal: i.price * i.quantity,
      }));
      const payload = {
        storeId, items, subtotal, total, discountAmount: 0, taxAmount: 0,
        payments: [{ method: paymentMethod, amount: paymentMethod === 'CASH' ? Number(amountPaid) : total }],
        customerId: selectedCustomer?.id || null,
      };
      const { data } = await api.post('/sales', payload);
      toast.success(`Sale complete — ${data.receiptNo}`);
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

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif", background: '#F6F6F7' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .product-card { transition: all 0.15s ease; }
        .product-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .product-card:active { transform: translateY(0); }
        .cat-tab { position: relative; transition: color 0.15s; }
        .cat-tab::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #008060; transform: scaleX(0); transition: transform 0.2s; }
        .cat-tab.active::after { transform: scaleX(1); }
      `}</style>

      {/* ── LEFT: Product Panel ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="h-14 bg-white border-b border-[#E1E3E5] flex items-center px-5 gap-4 flex-shrink-0">
          <button
            onClick={() => router.push('/overview')}
            className="flex items-center gap-1.5 text-sm text-[#6D7175] hover:text-[#1A1A1A] transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="w-px h-5 bg-[#E1E3E5]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">{company?.name || 'POS'}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-[#008060] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-[#1A1A1A]">{user?.name}</span>
            {user?.store?.name && <span className="text-[#6D7175]">· {user.store.name}</span>}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 bg-white border-b border-[#E1E3E5]">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  const match = products.find(p => p.barcode === search.trim() || p.sku === search.trim());
                  if (match) { addToCart(match); setSearch(''); }
                  else if (filtered.length === 1) { addToCart(filtered[0]); setSearch(''); }
                  else toast.error('Product not found');
                }
              }}
              placeholder="Search products or scan barcode..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F6F6F7] border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] placeholder-[#8C9196]"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="bg-white border-b border-[#E1E3E5] px-5">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide">
            {['All', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn('cat-tab py-3 text-sm font-semibold whitespace-nowrap transition-colors', activeCategory === cat ? 'active text-[#008060]' : 'text-[#6D7175] hover:text-[#1A1A1A]')}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={24} className="animate-spin text-[#6D7175]" />
              <p className="text-sm text-[#6D7175] font-medium">Loading products...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Package size={32} className="text-[#C9CCCF]" />
              <p className="text-sm text-[#6D7175] font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filtered.map((product) => {
                const stock = product._stockQty;
                const inCart = cart.find((i) => i.productId === product.id);
                const outOfStock = stock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={cn(
                      'product-card bg-white rounded-xl p-3 text-left relative border-2 overflow-hidden',
                      inCart ? 'border-[#008060]' : 'border-[#E1E3E5]',
                      outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#008060] text-white rounded-full text-xs flex items-center justify-center font-bold z-10">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center overflow-hidden bg-[#F6F6F7]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package size={22} className="text-[#C9CCCF]" />
                      )}
                    </div>

                    <p className="text-xs font-semibold text-[#1A1A1A] leading-tight line-clamp-2 mb-1">{product.name}</p>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <p className="text-sm font-bold text-[#1A1A1A]">${Number(product.basePrice).toFixed(2)}</p>
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-[#F6F6F7] text-[#6D7175]',
                      )}>
                        {stock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart / Checkout Panel ── */}
      <div className="w-[380px] flex-shrink-0 bg-white border-l border-[#E1E3E5] flex flex-col">

        {!showCheckout ? (
          <>
            {/* Cart header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#E1E3E5]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1A1A1A]">Order</h2>
                {totalItems > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EAF5F0] text-[#008060]">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {/* Customer selector */}
              <div className="relative">
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium border border-[#C9CCCF] bg-[#F6F6F7] hover:bg-[#EFEFEF] transition-colors"
                >
                  <UserCircle size={15} className="text-[#6D7175]" />
                  <span className={cn('flex-1 text-left truncate', selectedCustomer ? 'text-[#1A1A1A]' : 'text-[#8C9196]')}>
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </span>
                  {selectedCustomer ? (
                    <X size={14} className="text-[#6D7175] hover:text-[#D72C0D]"
                      onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); setShowCustomerDropdown(false); }} />
                  ) : (
                    <ChevronDown size={14} className="text-[#6D7175]" />
                  )}
                </button>

                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-lg border border-[#E1E3E5] bg-white"
                    style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <button
                      className="w-full text-left px-3.5 py-2.5 text-sm text-[#6D7175] hover:bg-[#F6F6F7] transition-colors"
                      onClick={() => { setSelectedCustomer(null); setShowCustomerDropdown(false); }}
                    >
                      Walk-in Customer
                    </button>
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-[#F6F6F7] transition-colors"
                        onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); }}
                      >
                        <span className="block font-semibold text-[#1A1A1A]">{c.name}</span>
                        {c.phone && <span className="text-xs text-[#6D7175]">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-3 space-y-1">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-[#F6F6F7] flex items-center justify-center">
                    <Package size={24} className="text-[#C9CCCF]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#6D7175]">Cart is empty</p>
                    <p className="text-xs text-[#8C9196] mt-1">Tap a product to add it</p>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId}
                    className="flex items-center gap-3 py-3 border-b border-[#F1F1F1] group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{item.name}</p>
                      <p className="text-xs text-[#6D7175] mt-0.5">${item.price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="w-7 h-7 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7] flex items-center justify-center hover:bg-[#EFEFEF] transition-colors"
                      >
                        <Minus size={11} className="text-[#6D7175]" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-[#1A1A1A]">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="w-7 h-7 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7] flex items-center justify-center hover:bg-[#EFEFEF] transition-colors"
                      >
                        <Plus size={11} className="text-[#6D7175]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-bold text-[#1A1A1A] w-14 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C9CCCF] hover:text-[#D72C0D]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            <div className="px-5 pb-5 pt-4 border-t border-[#E1E3E5]">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6D7175]">Subtotal</span>
                  <span className="font-semibold text-[#1A1A1A]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6D7175]">Tax</span>
                  <span className="font-semibold text-[#1A1A1A]">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E1E3E5]">
                  <span className="text-[#1A1A1A]">Total</span>
                  <span className="text-[#1A1A1A]">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
                style={{ background: cart.length > 0 ? '#008060' : '#C9CCCF' }}
              >
                {cart.length === 0 ? 'Add items to charge' : `Charge $${total.toFixed(2)}`}
              </button>
            </div>
          </>
        ) : (
          /* ── Checkout Panel ── */
          <>
            <div className="px-5 pt-5 pb-4 border-b border-[#E1E3E5] flex items-center gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="w-8 h-8 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7] flex items-center justify-center hover:bg-[#EFEFEF] transition-colors"
              >
                <ArrowLeft size={16} className="text-[#6D7175]" />
              </button>
              <h2 className="text-base font-bold text-[#1A1A1A]">Checkout</h2>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-5">
              {/* Order summary */}
              <div>
                <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-widest mb-3">Order Summary</p>
                <div className="rounded-xl border border-[#E1E3E5] bg-[#F6F6F7] p-4 space-y-2.5">
                  {cart.map((i) => (
                    <div key={i.productId} className="flex justify-between text-sm">
                      <span className="text-[#6D7175]">{i.name} <span className="font-semibold text-[#1A1A1A]">×{i.quantity}</span></span>
                      <span className="font-semibold text-[#1A1A1A]">${(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold pt-3 border-t border-[#E1E3E5] mt-3">
                    <span className="text-[#1A1A1A]">Total</span>
                    <span className="text-[#1A1A1A]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-widest mb-3">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-semibold border-2 transition-all',
                        paymentMethod === m.value
                          ? 'border-[#008060] bg-[#EAF5F0] text-[#008060]'
                          : 'border-[#E1E3E5] bg-white text-[#6D7175] hover:bg-[#F6F6F7]',
                      )}
                    >
                      <m.icon size={18} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash amount */}
              {paymentMethod === 'CASH' && (
                <div>
                  <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-widest mb-3">Amount Tendered</p>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={`$${total.toFixed(2)}`}
                    className="w-full px-4 py-3 rounded-xl border border-[#C9CCCF] bg-white text-[#1A1A1A] font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] placeholder-[#C9CCCF]"
                  />
                  {Number(amountPaid) >= total && (
                    <div className="mt-3 px-4 py-3 rounded-xl bg-[#EAF5F0] flex justify-between items-center">
                      <span className="text-sm font-semibold text-[#008060]">Change</span>
                      <span className="text-lg font-bold text-[#008060]">${change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Customer info */}
              {selectedCustomer && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E1E3E5] bg-[#F6F6F7]">
                  <div className="w-8 h-8 rounded-full bg-[#EAF5F0] flex items-center justify-center text-[#008060] text-xs font-bold flex-shrink-0">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && <p className="text-xs text-[#6D7175]">{selectedCustomer.phone}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Charge button */}
            <div className="px-5 pb-5 pt-4 border-t border-[#E1E3E5]">
              <button
                onClick={handleCheckout}
                disabled={submitting || (paymentMethod === 'CASH' && Number(amountPaid) < total)}
                className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ background: '#008060' }}
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing...</>
                ) : (
                  `Charge $${total.toFixed(2)}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
