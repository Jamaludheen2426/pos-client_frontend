'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  Loader2, Trash2, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ParsedProduct {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  basePrice: number;
  reorderLevel: number;
  _valid: boolean;
  _error?: string;
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  errors?: { row: number; message: string }[];
}

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const skuIdx = headers.indexOf('sku');
    const barcodeIdx = headers.indexOf('barcode');
    const categoryIdx = headers.indexOf('category');
    const priceIdx = headers.indexOf('baseprice');
    const reorderIdx = headers.indexOf('reorderlevel');

    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const name = cols[nameIdx] || '';
      const sku = cols[skuIdx] || '';
      const basePrice = Number(cols[priceIdx]) || 0;

      let valid = true;
      let error = '';
      if (!name) { valid = false; error = 'Name is required'; }
      else if (!sku) { valid = false; error = 'SKU is required'; }
      else if (basePrice <= 0) { valid = false; error = 'Price must be > 0'; }

      return {
        name,
        sku,
        barcode: cols[barcodeIdx] || '',
        category: cols[categoryIdx] || '',
        basePrice,
        reorderLevel: Number(cols[reorderIdx]) || 10,
        _valid: valid,
        _error: error || undefined,
      };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const products = parseCSV(text);
      if (products.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }
      setParsed(products);
      toast.success(`Parsed ${products.length} products from CSV`);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const products = parseCSV(text);
      if (products.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }
      setParsed(products);
      toast.success(`Parsed ${products.length} products from CSV`);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    const validProducts = parsed.filter((p) => p._valid).map(({ _valid, _error, ...rest }) => rest);
    if (validProducts.length === 0) {
      toast.error('No valid products to import');
      return;
    }
    setImporting(true);
    try {
      const res = await api.post('/products/bulk-import', { products: validProducts });
      const data = res.data;
      setResult({
        successCount: data.successCount ?? validProducts.length,
        errorCount: data.errorCount ?? 0,
        errors: data.errors,
      });
      toast.success(`Imported ${data.successCount ?? validProducts.length} products`);
    } catch {
      toast.error('Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'name,sku,barcode,category,basePrice,reorderLevel\nSample Product,SKU-001,123456789,Beverages,9.99,10\nAnother Product,SKU-002,987654321,Snacks,4.50,25';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setFile(null);
    setParsed([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = parsed.filter((p) => p._valid).length;
  const invalidCount = parsed.filter((p) => !p._valid).length;

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#202223]">Import Products</h1>
          <p className="text-[#6D7175] text-sm mt-1">Bulk import products from a CSV file</p>
        </div>
        <button onClick={downloadTemplate}
          className="border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] text-[#202223] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
          <Download size={16} />
          Download Template
        </button>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-[#EEF3FB] border border-[#2C6ECB]/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={18} className="text-[#2C6ECB] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#202223]">CSV Format Guide</p>
            <p className="text-sm text-[#2C6ECB] mt-1">
              Your CSV file should include the following columns:
            </p>
            <code className="block mt-2 text-xs bg-white/70 text-[#2C6ECB] px-3 py-2 rounded-lg font-mono border border-[#2C6ECB]/20">
              name,sku,barcode,category,basePrice,reorderLevel
            </code>
            <p className="text-xs text-[#6D7175] mt-2">
              Required fields: name, sku, basePrice. Other fields are optional.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-2 border-dashed border-[#C9CCCF] rounded-xl p-12 text-center cursor-pointer hover:border-[#008060] hover:bg-[#EAF5F0]/30 transition-colors"
        >
          <Upload size={40} className="mx-auto text-[#C9CCCF] mb-4" />
          <p className="text-sm font-semibold text-[#202223]">Drop your CSV file here or click to browse</p>
          <p className="text-xs text-[#8C9196] mt-1">Supports .csv files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Preview */}
      {file && parsed.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-xl border border-[#E1E3E5] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-[#8C9196]" />
                <span className="text-sm font-semibold text-[#202223]">{file.name}</span>
              </div>
              <span className="text-sm text-[#8C9196]">|</span>
              <span className="text-sm text-[#6D7175]">{parsed.length} rows</span>
              {validCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-[#008060] font-medium">
                  <CheckCircle2 size={14} /> {validCount} valid
                </span>
              )}
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-[#D72C0D] font-medium">
                  <XCircle size={14} /> {invalidCount} invalid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearAll}
                className="border border-[#C9CCCF] bg-white hover:bg-[#FFF4F4] hover:border-[#D72C0D] hover:text-[#D72C0D] text-[#6D7175] px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition">
                <Trash2 size={14} /> Clear
              </button>
              <button onClick={handleImport} disabled={importing || validCount === 0}
                className="bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Import {validCount} Products
              </button>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div className={cn(
              'rounded-xl border p-4 flex items-start gap-3',
              result.errorCount > 0
                ? 'bg-[#FFF4E4] border-[#B25000]/30'
                : 'bg-[#EAF5F0] border-[#008060]/30',
            )}>
              {result.errorCount > 0 ? (
                <AlertTriangle size={18} className="text-[#B25000] mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="text-[#008060] mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-[#202223]">
                  Import complete: {result.successCount} succeeded, {result.errorCount} failed
                </p>
                {result.errors && result.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs text-[#D72C0D]">Row {err.row}: {err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-[#E1E3E5]">
            <div className="px-5 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223] text-sm">Preview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3 w-8">#</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">SKU</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Barcode</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Category</th>
                    <th className="text-right text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Price</th>
                    <th className="text-right text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Reorder</th>
                    <th className="text-center text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E3E5]">
                  {parsed.map((p, i) => (
                    <tr key={i} className={cn('transition-colors', !p._valid ? 'bg-[#FFF4F4]' : 'hover:bg-[#F6F6F7]')}>
                      <td className="px-5 py-3 text-xs text-[#8C9196]">{i + 1}</td>
                      <td className="px-5 py-3 text-sm text-[#202223]">{p.name || '-'}</td>
                      <td className="px-5 py-3 text-sm text-[#6D7175]">{p.sku || '-'}</td>
                      <td className="px-5 py-3 text-sm text-[#6D7175]">{p.barcode || '-'}</td>
                      <td className="px-5 py-3 text-sm text-[#6D7175]">{p.category || '-'}</td>
                      <td className="px-5 py-3 text-sm text-[#202223] text-right">${p.basePrice.toFixed(2)}</td>
                      <td className="px-5 py-3 text-sm text-[#6D7175] text-right">{p.reorderLevel}</td>
                      <td className="px-5 py-3 text-center">
                        {p._valid ? (
                          <CheckCircle2 size={16} className="text-[#008060] inline" />
                        ) : (
                          <span className="text-xs text-[#D72C0D] font-medium">{p._error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
