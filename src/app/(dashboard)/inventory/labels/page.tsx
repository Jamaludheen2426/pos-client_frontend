'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, Printer, Settings2, Package } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  basePrice: number;
}

interface PrintItem extends Product {
  printQty: number;
}

function Barcodesvg({ code, height = 40 }: { code: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        lineColor: '#000000',
        width: 1.5,
        height,
        displayValue: true,
        fontSize: 9,
        margin: 2,
        background: 'transparent',
      });
    } catch {
      // invalid barcode value
    }
  }, [code, height]);
  return <svg ref={svgRef} className="max-w-full max-h-full" />;
}

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);

  const [labelWidth, setLabelWidth] = useState('80');
  const [labelHeight, setLabelHeight] = useState('40');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);

  useEffect(() => {
    api.get('/products?limit=1000')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.products || [];
        setProducts(data);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.sku && p.sku.toLowerCase().includes(lower)) ||
      (p.barcode && p.barcode.toLowerCase().includes(lower)),
    ).slice(0, 10);
  }, [products, search]);

  const addToQueue = (product: Product) => {
    setPrintQueue((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) return prev.map((p) => p.id === product.id ? { ...p, printQty: p.printQty + 1 } : p);
      return [...prev, { ...product, printQty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setPrintQueue((prev) =>
      prev.map((p) => p.id === id ? { ...p, printQty: Math.max(1, p.printQty + delta) } : p),
    );
  };

  const removeFromQueue = (id: number) => setPrintQueue((prev) => prev.filter((p) => p.id !== id));

  const handlePrint = () => {
    if (printQueue.length === 0) { toast.error('Add products to the queue first'); return; }
    window.print();
  };

  const labelsToPrint = useMemo(() => {
    const list: Product[] = [];
    printQueue.forEach((item) => {
      for (let i = 0; i < item.printQty; i++) list.push(item);
    });
    return list;
  }, [printQueue]);

  const printCss = `
    @media print {
      @page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; }
      body > * { display: none !important; }
      #label-print-area { display: flex !important; flex-wrap: wrap; }
      #label-print-area, #label-print-area * { visibility: visible !important; }
      .label-page {
        width: ${labelWidth}mm;
        height: ${labelHeight}mm;
        page-break-after: always;
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-sizing: border-box;
        padding: 2mm;
        background: white;
      }
      .label-page:last-child { page-break-after: auto; }
    }
  `;

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#202223]">Barcode Labels</h1>
          <p className="text-[#6D7175] text-sm mt-1">Design and print standardized retail product stickers.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={printQueue.length === 0}
          className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
        >
          <Printer size={16} />
          Print {labelsToPrint.length} Label{labelsToPrint.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">

        {/* ── Left panel: Search + Config ── */}
        <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-[#E1E3E5] bg-[#F6F6F7]">
            <h3 className="font-semibold text-[#202223] text-sm flex items-center gap-2">
              <Search size={15} className="text-[#008060]" /> Find Products
            </h3>
          </div>

          <div className="p-5">
            {/* Search input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode…"
                className="w-full pl-10 pr-4 py-2.5 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition"
              />
            </div>

            {/* Search results — fixed height so config is always visible */}
            <div className="h-56 overflow-y-auto border border-[#E1E3E5] rounded-lg bg-[#F6F6F7]/40">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[#8C9196]">Loading inventory…</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Package size={28} className="text-[#C9CCCF] mb-2" />
                  <p className="text-sm font-semibold text-[#202223]">
                    {search ? 'No matching products' : 'Start typing to search'}
                  </p>
                  <p className="text-xs text-[#8C9196] mt-1">Search by name, SKU, or barcode</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#E1E3E5]">
                  {filteredProducts.map((p) => {
                    const code = p.barcode || p.sku;
                    return (
                      <li key={p.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#EAF5F0]/50 transition-colors">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-medium text-[#202223] truncate">{p.name}</p>
                          <p className="text-xs text-[#8C9196] font-mono mt-0.5">{code || 'No code'}</p>
                        </div>
                        <button
                          onClick={() => addToQueue(p)}
                          disabled={!code}
                          className="flex-shrink-0 p-1.5 text-[#008060] hover:bg-[#EAF5F0] rounded-lg transition disabled:opacity-30"
                          title={!code ? 'Product needs a SKU or Barcode' : 'Add to queue'}
                        >
                          <Plus size={17} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Label configuration */}
            <div className="mt-5 pt-5 border-t border-[#E1E3E5]">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-4">
                <Settings2 size={13} /> Label Configuration
              </h4>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Width (mm)</label>
                  <input
                    type="number" min="30" max="200" value={labelWidth}
                    onChange={(e) => setLabelWidth(e.target.value)}
                    className="w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Height (mm)</label>
                  <input
                    type="number" min="15" max="150" value={labelHeight}
                    onChange={(e) => setLabelHeight(e.target.value)}
                    className="w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 text-sm text-[#202223] cursor-pointer select-none">
                  <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="w-4 h-4 rounded accent-[#008060]" />
                  Show product name
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#202223] cursor-pointer select-none">
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-4 h-4 rounded accent-[#008060]" />
                  Show retail price
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel: Print Queue ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-[#E1E3E5] bg-[#F6F6F7] flex justify-between items-center">
            <h3 className="font-semibold text-[#202223] text-sm flex items-center gap-2">
              <Printer size={15} className="text-[#008060]" /> Print Label Queue
            </h3>
            <span className="text-xs font-semibold bg-[#EAF5F0] text-[#008060] px-2.5 py-1 rounded-full">
              {labelsToPrint.length} total label{labelsToPrint.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Queue body — min height matches left panel approx */}
          <div className="p-5 min-h-[420px]">
            {printQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <Printer size={44} className="text-[#C9CCCF] mb-3" />
                <p className="text-base font-semibold text-[#202223]">Queue is empty</p>
                <p className="text-sm text-[#6D7175] mt-1">Search for products on the left and click + to add them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printQueue.map((item) => {
                  const code = item.barcode || item.sku;
                  const priceStr = `$${Number(item.basePrice).toFixed(2)}`;
                  return (
                    <div key={item.id} className="bg-white border border-[#E1E3E5] rounded-xl p-4 relative group hover:border-[#C9CCCF] transition-colors">
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-[#FFF4F4] text-[#D72C0D] hover:bg-[#D72C0D] hover:text-white rounded-lg transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>

                      <div className="flex gap-4 items-start">
                        {/* Barcode preview */}
                        <div className="w-28 h-[72px] bg-[#F6F6F7] border border-dashed border-[#C9CCCF] rounded-lg flex flex-col items-center justify-center px-1.5 py-1 shrink-0 overflow-hidden">
                          {showName && (
                            <p className="text-[5.5px] font-bold truncate w-full text-center text-[#202223] leading-tight mb-0.5">{item.name}</p>
                          )}
                          <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                            <Barcodesvg code={code} height={30} />
                          </div>
                          {showPrice && (
                            <p className="text-[7px] font-bold text-[#202223] mt-0.5 leading-none">{priceStr}</p>
                          )}
                        </div>

                        {/* Info + controls */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#202223] truncate pr-6 leading-snug">{item.name}</p>
                          <p className="text-xs text-[#8C9196] mt-0.5">{code}</p>
                          <p className="text-xs font-semibold text-[#008060] mt-0.5">{priceStr}</p>

                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Copies</span>
                            <div className="flex items-center bg-[#F6F6F7] rounded-lg border border-[#E1E3E5]">
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                className="px-2 py-1.5 hover:bg-[#E1E3E5] rounded-l-lg text-[#6D7175] transition-colors text-sm font-semibold"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-9 text-center text-sm font-bold text-[#202223] bg-white border-x border-[#E1E3E5] py-1">
                                {item.printQty}
                              </span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                className="px-2 py-1.5 hover:bg-[#E1E3E5] rounded-r-lg text-[#6D7175] transition-colors text-sm font-semibold"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print-only output */}
      <div id="label-print-area" style={{ display: 'none' }}>
        {labelsToPrint.map((item, index) => {
          const code = item.barcode || item.sku;
          return (
            <div key={`${item.id}-${index}`} className="label-page">
              {showName && (
                <p style={{ fontSize: '8pt', fontWeight: 700, textAlign: 'center', marginBottom: '1mm', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {item.name}
                </p>
              )}
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Barcodesvg code={code} height={Math.max(20, Number(labelHeight) * 0.8)} />
              </div>
              {showPrice && (
                <p style={{ fontSize: '10pt', fontWeight: 800, textAlign: 'center', marginTop: '1mm' }}>
                  ${Number(item.basePrice).toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
