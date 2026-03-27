'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, Printer, Settings2, Package } from 'lucide-react';
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

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);

  // Label configuration
  const [labelWidth, setLabelWidth] = useState('50'); // 50mm
  const [labelHeight, setLabelHeight] = useState('30'); // 30mm
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
      if (existing) return prev.map((p) => (p.id === product.id ? { ...p, printQty: p.printQty + 1 } : p));
      return [...prev, { ...product, printQty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setPrintQueue((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQty = Math.max(1, p.printQty + delta);
          return { ...p, printQty: newQty };
        }
        return p;
      }),
    );
  };

  const removeFromQueue = (id: number) => setPrintQueue((prev) => prev.filter((p) => p.id !== id));

  const handlePrint = () => {
    if (printQueue.length === 0) {
      toast.error('Add products to the queue first');
      return;
    }
    window.print();
  };

  // Flatten the queue to generate X stickers per item
  const labelsToPrint = useMemo(() => {
    const list: Product[] = [];
    printQueue.forEach((item) => {
      for (let i = 0; i < item.printQty; i++) {
        list.push(item);
      }
    });
    return list;
  }, [printQueue]);

  return (
    <div className="flex flex-col h-[calc(100vh-190px)]">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${labelWidth}mm ${labelHeight}mm;
            margin: 0;
          }
          body, html {
            background-color: white !important;
            margin: 0 !important; 
            padding: 0 !important;
            height: 100% !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0; padding: 0;
            width: 100%;
            display: flex !important;
            flex-direction: column;
          }
          .label-page {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-sizing: border-box;
            padding: 2mm;
            background: white;
          }
          .label-page:last-child {
            page-break-after: auto;
          }
        }
      ` }} />

      <div className="flex items-center justify-between xl:mb-6 mb-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Barcode Labels Generator</h2>
          <p className="text-gray-500 text-sm mt-1">Design and print standardized retail product stickers.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={printQueue.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow transition disabled:opacity-50"
        >
          <Printer size={18} />
          Print {labelsToPrint.length} Labels (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 print:hidden">
        {/* Left Column: Search & Settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Search size={16} className="text-blue-500" /> Find Products
            </h3>
          </div>
          
          <div className="p-5 flex-1 flex flex-col min-h-0">
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name, SKU, or Barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg bg-gray-50/30">
              {loading ? (
                <p className="p-4 text-sm text-gray-400 text-center">Loading inventory...</p>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <Package size={24} className="text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-600">No products found</p>
                  <p className="text-xs text-gray-400 mt-1">Start typing to generate labels</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => {
                    const code = p.barcode || p.sku;
                    return (
                      <li key={p.id} className="flex items-center justify-between p-3 hover:bg-blue-50/50 transition">
                        <div className="min-w-0 pr-3">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{code ? `Code: ${code}` : 'No barcode/SKU'}</p>
                        </div>
                        <button
                          onClick={() => addToQueue(p)}
                          disabled={!code}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-30"
                          title={!code ? 'Product needs a SKU or Barcode' : 'Add to Print Queue'}
                        >
                          <Plus size={18} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Label Document Settings */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                <Settings2 size={16} className="text-gray-500" /> Label Configuration
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Width (mm)</label>
                  <input type="number" value={labelWidth} onChange={(e) => setLabelWidth(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Height (mm)</label>
                  <input type="number" value={labelHeight} onChange={(e) => setLabelHeight(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-blue-600" />
                  Print Product Name
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-blue-600" />
                  Print Retail Price
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Print Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Printer size={16} className="text-purple-500" /> Print Label Queue
            </h3>
            <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
              {labelsToPrint.length} total labels
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
            {printQueue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Printer size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-base font-semibold text-gray-900">Your queue is empty</p>
                  <p className="text-sm text-gray-500 mt-1">Search for products on the left to add them here.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printQueue.map((item) => {
                  const code = item.barcode || item.sku;
                  const priceStr = `$${Number(item.basePrice).toFixed(2)}`;
                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative group">
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      <div className="flex gap-4">
                        {/* Live Preview Miniature */}
                        <div className="w-24 h-16 bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center p-1 shrink-0 overflow-hidden relative">
                           {showName && <div className="text-[6px] font-bold truncate w-full text-center">{item.name}</div>}
                           <img 
                             src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${code}&scale=2&includetext=true`}
                             alt="barcode"
                             className="max-w-full max-h-full object-contain"
                           />
                           {showPrice && <div className="text-[7px] font-bold mt-0.5">{priceStr}</div>}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{code} &middot; {priceStr}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Copies:</span>
                            <div className="flex items-center bg-gray-100 rounded-md border border-gray-200">
                              <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-gray-200 rounded-l-md text-gray-600">
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-gray-900 bg-white border-x border-gray-200 py-0.5">
                                {item.printQty}
                              </span>
                              <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-gray-200 rounded-r-md text-gray-600">
                                <Plus size={14} />
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

      <div id="print-area" className="hidden print:flex">
        {labelsToPrint.map((item, index) => {
          const code = item.barcode || item.sku;
          return (
            <div key={`${item.id}-${index}`} className="label-page">
              {showName && (
                <div className="font-bold text-center text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis w-full"
                     style={{ fontSize: `min(${Math.max(8, Number(labelHeight) * 0.2)}px, 12px)`, marginBottom: '1mm' }}>
                  {item.name}
                </div>
              )}
              
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                <img 
                   src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${code}&scale=3&includetext=true`}
                   alt={code}
                   className="max-w-full max-h-full object-contain"
                />
              </div>

              {showPrice && (
                <div className="font-extrabold text-gray-900 text-center text-xl mt-[1mm]">
                  ${Number(item.basePrice).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
