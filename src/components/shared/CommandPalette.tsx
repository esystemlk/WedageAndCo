import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, LayoutDashboard, Users,
  UserSquare2, Truck, Package, ShoppingCart, Receipt, FileBarChart,
  ClipboardSignature, Utensils, Wrench, Plus, Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getStaffMembers } from '../../services/staffService';
import { getCustomers } from '../../services/customerService';
import { getVehicles } from '../../services/fleetService';
import { getSuppliers } from '../../services/supplierService';
import { getPurchaseOrders } from '../../services/poService';
import { getInvoices } from '../../services/invoiceService';

interface CommandItem {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: React.ReactNode;
  to: string;
  keywords?: string;
}

// Static navigation + quick actions (always available, no fetch).
const STATIC_ITEMS: CommandItem[] = [
  { id: 'nav-dash', label: 'Dashboard', group: 'Navigation', icon: <LayoutDashboard className="w-4 h-4" />, to: '/' },
  { id: 'nav-staff', label: 'Staff Directory', group: 'Navigation', icon: <UserSquare2 className="w-4 h-4" />, to: '/staff' },
  { id: 'nav-cust', label: 'Customers', group: 'Navigation', icon: <Users className="w-4 h-4" />, to: '/customers' },
  { id: 'nav-fleet', label: 'Fleet', group: 'Navigation', icon: <Truck className="w-4 h-4" />, to: '/fleet' },
  { id: 'nav-sup', label: 'Suppliers', group: 'Navigation', icon: <Package className="w-4 h-4" />, to: '/suppliers' },
  { id: 'nav-inv', label: 'Inventory', group: 'Navigation', icon: <ShoppingCart className="w-4 h-4" />, to: '/inventory' },
  { id: 'nav-po', label: 'Purchase Orders', group: 'Navigation', icon: <ClipboardSignature className="w-4 h-4" />, to: '/purchase-orders' },
  { id: 'nav-meals', label: 'Meal Management', group: 'Navigation', icon: <Utensils className="w-4 h-4" />, to: '/meals' },
  { id: 'nav-invo', label: 'Invoices', group: 'Navigation', icon: <Receipt className="w-4 h-4" />, to: '/invoices' },
  { id: 'nav-garage', label: 'Garage', group: 'Navigation', icon: <Wrench className="w-4 h-4" />, to: '/garage' },
  { id: 'nav-reports', label: 'Reports', group: 'Navigation', icon: <FileBarChart className="w-4 h-4" />, to: '/reports' },
  { id: 'act-staff', label: 'New Staff Member', group: 'Quick Actions', icon: <Plus className="w-4 h-4" />, to: '/staff/new' },
  { id: 'act-cust', label: 'New Customer', group: 'Quick Actions', icon: <Plus className="w-4 h-4" />, to: '/customers/new' },
  { id: 'act-veh', label: 'New Vehicle', group: 'Quick Actions', icon: <Plus className="w-4 h-4" />, to: '/fleet/new' },
  { id: 'act-po', label: 'Issue Purchase Order', group: 'Quick Actions', icon: <Plus className="w-4 h-4" />, to: '/purchase-orders/new' },
  { id: 'act-inv', label: 'New Invoice', group: 'Quick Actions', icon: <Plus className="w-4 h-4" />, to: '/invoices/new' },
];

const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [records, setRecords] = useState<CommandItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lazy-load searchable records the first time the palette opens.
  const loadRecords = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const [staff, customers, vehicles, suppliers, pos, invoices] = await Promise.all([
        getStaffMembers().catch(() => []),
        getCustomers().catch(() => []),
        getVehicles().catch(() => []),
        getSuppliers().catch(() => []),
        getPurchaseOrders().catch(() => []),
        getInvoices().catch(() => []),
      ]);
      const items: CommandItem[] = [];
      (staff || []).forEach((s: any) => items.push({ id: `s-${s.id}`, label: s.fullName, sub: s.position || s.category, group: 'Staff', icon: <UserSquare2 className="w-4 h-4" />, to: `/staff/${s.id}`, keywords: `${s.staffId || ''} ${s.phone || ''}` }));
      (customers || []).forEach((c: any) => items.push({ id: `c-${c.id}`, label: c.name, sub: c.phone, group: 'Customers', icon: <Users className="w-4 h-4" />, to: `/customers/${c.id}` }));
      (vehicles || []).forEach((v: any) => items.push({ id: `v-${v.id}`, label: v.plateNo || `${v.make || ''} ${v.model || ''}`.trim(), sub: `${v.make || ''} ${v.model || ''}`.trim(), group: 'Fleet', icon: <Truck className="w-4 h-4" />, to: `/fleet/${v.id}` }));
      (suppliers || []).forEach((s: any) => items.push({ id: `sup-${s.id}`, label: s.name, sub: (s.supplyCategories || [])[0], group: 'Suppliers', icon: <Package className="w-4 h-4" />, to: `/suppliers/${s.id}/edit` }));
      (pos || []).forEach((p: any) => items.push({ id: `po-${p.id}`, label: p.poNumber, sub: p.supplierName, group: 'Purchase Orders', icon: <ClipboardSignature className="w-4 h-4" />, to: `/purchase-orders/${p.id}` }));
      (invoices || []).forEach((i: any) => items.push({ id: `i-${i.id}`, label: i.invoiceNo, sub: i.customerName || i.clientName, group: 'Invoices', icon: <Receipt className="w-4 h-4" />, to: `/invoices/${i.id}` }));
      setRecords(items);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  useEffect(() => {
    if (open) {
      setQuery(''); setActive(0);
      loadRecords();
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open, loadRecords]);

  // Fuzzy-ish filter: all results when empty query shows static items only.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [...STATIC_ITEMS, ...records];
    if (!q) return STATIC_ITEMS;
    const matches = pool.filter(it =>
      it.label.toLowerCase().includes(q) ||
      (it.sub || '').toLowerCase().includes(q) ||
      (it.keywords || '').toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q),
    );
    return matches.slice(0, 40);
  }, [query, records]);

  useEffect(() => { setActive(0); }, [query]);

  const choose = useCallback((item: CommandItem) => {
    onClose();
    navigate(item.to);
  }, [navigate, onClose]);

  // Keyboard navigation within the palette.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  // Group results for display while keeping a flat index for keyboard nav.
  let flatIndex = -1;
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    results.forEach(r => { if (!map.has(r.group)) map.set(r.group, []); map.get(r.group)!.push(r); });
    return Array.from(map.entries());
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -12 }} transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onKeyDown={onKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b border-gray-100">
              {loading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Search className="w-5 h-5 text-gray-400" />}
              <input
                ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search staff, customers, vehicles, invoices… or jump to a page"
                className="flex-1 py-4 bg-transparent outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
              />
              <kbd className="hidden sm:block text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-md">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[52vh] overflow-y-auto custom-scrollbar py-2">
              {results.length === 0 ? (
                <div className="py-12 text-center text-sm font-bold text-gray-400">No results for "{query}"</div>
              ) : grouped.map(([group, items]) => (
                <div key={group} className="px-2">
                  <p className="px-3 pt-2 pb-1 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{group}</p>
                  {items.map(item => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => choose(item)}
                        className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          active === idx ? 'bg-indigo-50' : 'hover:bg-gray-50')}
                      >
                        <span className={cn('flex-shrink-0', active === idx ? 'text-indigo-600' : 'text-gray-400')}>{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.label}</p>
                          {item.sub && <p className="text-[11px] text-gray-400 font-medium truncate">{item.sub}</p>}
                        </div>
                        {active === idx && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-400">
              <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> Navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> Open</span>
              <span className="ml-auto flex items-center gap-1"><kbd className="bg-white border border-gray-200 px-1.5 rounded">⌘</kbd><kbd className="bg-white border border-gray-200 px-1.5 rounded">K</kbd></span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
