import React, { useEffect, useState } from 'react';
import {
  Package, Plus, Search, Fuel, Droplets, Filter, Zap, Battery,
  FileText, AlertTriangle, TrendingDown, CheckCircle, Edit,
  Trash2, RefreshCw, Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import {
  getInventoryItems, deleteInventoryItem,
  InventoryItem, InventoryCategory, CATEGORY_LABELS, StockStatus
} from '../../services/inventoryService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'fuel': <Fuel className="w-4 h-4" />,
  'lubricants': <Droplets className="w-4 h-4" />,
  'filters': <Filter className="w-4 h-4" />,
  'parts-new': <Archive className="w-4 h-4" />,
  'parts-used': <RefreshCw className="w-4 h-4" />,
  'battery-new': <Battery className="w-4 h-4" />,
  'battery-used': <Battery className="w-4 h-4" />,
  'electrical': <Zap className="w-4 h-4" />,
  'stationery': <FileText className="w-4 h-4" />,
  'other': <Package className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string }> = {
  'available': { label: 'Available', color: 'bg-emerald-100 text-emerald-700' },
  'low-stock': { label: 'Low Stock', color: 'bg-amber-100 text-amber-700' },
  'out-of-stock': { label: 'Out of Stock', color: 'bg-red-100 text-red-700' },
  'reserved': { label: 'Reserved', color: 'bg-blue-100 text-blue-700' },
  'damaged': { label: 'Damaged', color: 'bg-rose-100 text-rose-700' },
  'expired': { label: 'Expired', color: 'bg-gray-100 text-gray-500' },
};

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Items' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'lubricants', label: 'Lubricants' },
  { key: 'filters', label: 'Filters' },
  { key: 'parts', label: 'Parts' },
  { key: 'battery', label: 'Battery' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'stationery', label: 'Stationery' },
];

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getInventoryItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this inventory item? This cannot be undone.')) return;
    await deleteInventoryItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const filtered = items.filter(item => {
    const tabMatch = activeTab === 'all'
      || item.category === activeTab
      || (activeTab === 'parts' && (item.category === 'parts-new' || item.category === 'parts-used'))
      || (activeTab === 'battery' && (item.category === 'battery-new' || item.category === 'battery-used'));
    const searchMatch = !search
      || item.name.toLowerCase().includes(search.toLowerCase())
      || item.sku.toLowerCase().includes(search.toLowerCase())
      || (item.subCategory || '').toLowerCase().includes(search.toLowerCase())
      || (item.brand || '').toLowerCase().includes(search.toLowerCase());
    return tabMatch && searchMatch;
  });

  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.stockStatus === 'low-stock').length,
    outOfStock: items.filter(i => i.stockStatus === 'out-of-stock').length,
    totalValue: items.reduce((s, i) => s + ((i.currentStock || 0) * (i.purchaseCost || 0)), 0),
  };

  const alertItems = items.filter(i => i.stockStatus === 'low-stock' || i.stockStatus === 'out-of-stock');

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Stock Inventory</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
            Operational intelligence · {items.length} items tracked
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate('/inventory/fuel/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
          >
            <Fuel className="w-3.5 h-3.5" /> Issue Fuel
          </button>
          <button
            onClick={() => navigate('/inventory/oil/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
          >
            <Droplets className="w-3.5 h-3.5" /> Issue Oil / Lubricant
          </button>
          <button
            onClick={() => navigate('/inventory/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Low Stock', value: stats.lowStock, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          {
            label: 'Total Value (LKR)',
            value: stats.totalValue >= 1000000
              ? `${(stats.totalValue / 1000000).toFixed(1)}M`
              : stats.totalValue >= 1000
              ? `${(stats.totalValue / 1000).toFixed(0)}K`
              : stats.totalValue.toLocaleString(),
            icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50'
          },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {alertItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
              {alertItems.length} Item{alertItems.length > 1 ? 's' : ''} Need Attention
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertItems.map(item => (
              <button key={item.id} onClick={() => navigate(`/inventory/${item.id}/edit`)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide hover:opacity-80 transition-opacity",
                  item.stockStatus === 'out-of-stock' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                )}
              >
                {item.name} · {item.currentStock} {item.unitType}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Items Table */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU, brand..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  activeTab === tab.key
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No items found</p>
            <button onClick={() => navigate('/inventory/new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              <Plus className="w-3 h-3" /> Add First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['SKU', 'Item', 'Category', 'Current Stock', 'Min Level', 'Cost (LKR)', 'Location', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filtered.map((item, i) => (
                    <motion.tr key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{item.name}</p>
                          {item.brand && <p className="text-[10px] text-gray-400 font-bold uppercase">{item.brand}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">{CATEGORY_ICONS[item.category]}</span>
                          <div>
                            <p className="text-[10px] font-bold text-gray-600">{CATEGORY_LABELS[item.category]}</p>
                            {item.subCategory && <p className="text-[9px] text-gray-400">{item.subCategory}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className={cn(
                            "text-sm font-black",
                            item.currentStock <= 0 ? 'text-red-600'
                            : item.currentStock <= (item.minStockLevel || 0) ? 'text-amber-600'
                            : 'text-gray-900'
                          )}>
                            {item.currentStock}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">{item.unitType}</span>
                          {item.maxStockLevel > 0 && (
                            <div className="mt-1 w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={cn("h-1.5 rounded-full transition-all",
                                  item.currentStock <= 0 ? 'bg-red-500 w-0'
                                  : item.currentStock <= item.minStockLevel ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                )}
                                style={{ width: `${Math.min(100, ((item.currentStock || 0) / (item.maxStockLevel || 1)) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 font-bold">
                        {item.minStockLevel} <span className="text-[10px] text-gray-400">{item.unitType}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-700">
                        {item.purchaseCost > 0 ? item.purchaseCost.toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-[10px] text-gray-500 font-bold">
                        {item.warehouseLocation || '—'}
                        {item.binRackNumber && <span className="text-gray-400"> · {item.binRackNumber}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
                          STATUS_CONFIG[item.stockStatus]?.color || 'bg-gray-100 text-gray-500'
                        )}>
                          {STATUS_CONFIG[item.stockStatus]?.label || item.stockStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/inventory/${item.id}/edit`)}
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id!)}
                            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
