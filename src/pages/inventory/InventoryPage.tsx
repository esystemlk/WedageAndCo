import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2,
  Edit2,
  Trash2,
  Truck,
  ShoppingCart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  location: string;
  lastRestocked: Date;
  status: InventoryStatus;
  description?: string;
}

const sampleInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Engine Oil - 5W-30',
    sku: 'OIL-001',
    category: 'Fluids',
    quantity: 45,
    minQuantity: 20,
    unitPrice: 2500,
    location: 'Warehouse A',
    lastRestocked: new Date(2026, 4, 1),
    status: 'in-stock',
    description: 'Premium synthetic engine oil'
  },
  {
    id: '2',
    name: 'Brake Pads - Set',
    sku: 'BRAKE-002',
    category: 'Parts',
    quantity: 8,
    minQuantity: 15,
    unitPrice: 8500,
    location: 'Warehouse B',
    lastRestocked: new Date(2026, 4, 5),
    status: 'low-stock',
    description: 'Front brake pad set'
  },
  {
    id: '3',
    name: 'Tire - 165/R13',
    sku: 'TIRE-003',
    category: 'Tyres',
    quantity: 0,
    minQuantity: 10,
    unitPrice: 12000,
    location: 'Warehouse A',
    lastRestocked: new Date(2026, 3, 20),
    status: 'out-of-stock',
    description: 'Standard 13 inch tire'
  },
  {
    id: '4',
    name: 'Air Filter',
    sku: 'FILTER-004',
    category: 'Parts',
    quantity: 62,
    minQuantity: 30,
    unitPrice: 1800,
    location: 'Warehouse C',
    lastRestocked: new Date(2026, 4, 10),
    status: 'in-stock',
    description: 'Engine air filter'
  },
  {
    id: '5',
    name: 'Coolant - 5L',
    sku: 'COOL-005',
    category: 'Fluids',
    quantity: 25,
    minQuantity: 20,
    unitPrice: 3200,
    location: 'Warehouse A',
    lastRestocked: new Date(2026, 4, 8),
    status: 'in-stock',
    description: 'Antifreeze coolant'
  },
  {
    id: '6',
    name: 'Wiper Blades',
    sku: 'WIPER-006',
    category: 'Parts',
    quantity: 12,
    minQuantity: 25,
    unitPrice: 1500,
    location: 'Warehouse B',
    lastRestocked: new Date(2026, 4, 2),
    status: 'low-stock',
    description: 'Universal wiper blade set'
  }
];

const categories = ['All', 'Fluids', 'Parts', 'Tyres', 'Tools', 'Other'];

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(sampleInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const lowStock = inventory.filter(item => item.status === 'low-stock').length;
    const outOfStock = inventory.filter(item => item.status === 'out-of-stock').length;
    return { totalItems, totalValue, lowStock, outOfStock };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const getStatusConfig = (status: InventoryStatus) => {
    switch (status) {
      case 'in-stock':
        return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 };
      case 'low-stock':
        return { label: 'Low Stock', color: 'bg-amber-100 text-amber-600', icon: AlertTriangle };
      case 'out-of-stock':
        return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-600', icon: AlertTriangle };
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="Inventory Management" 
        subtitle="Track and manage your stock and supplies"
        actions={
          <button 
            onClick={() => {
              setSelectedItem(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Items', value: stats.totalItems, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Value', value: formatCurrency(stats.totalValue), icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm"
          >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h4 className="text-2xl font-black text-gray-900">{stat.value}</h4>
               </div>
               <div className={`p-3 rounded-2xl border shadow-sm ${stat.bg} border-gray-100 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Restock</th>
                <th className="text-right py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono font-bold text-gray-600">{item.sku}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-gray-600">{item.category}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-black text-lg", item.status === 'out-of-stock' ? 'text-rose-600' : item.status === 'low-stock' ? 'text-amber-600' : 'text-emerald-600')}>
                          {item.quantity}
                        </span>
                        {item.quantity < item.minQuantity && (
                          <span className="text-[10px] text-amber-600 font-black">({item.minQuantity} min)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-gray-700">{formatCurrency(item.unitPrice)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", statusConfig.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-gray-600">{item.location}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-gray-500">{formatDate(item.lastRestocked)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
