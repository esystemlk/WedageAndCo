import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Save, ArrowLeft, User, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createItemIssue } from '../../services/itemIssueService';
import { getInventoryItems, InventoryItem, CATEGORY_LABELS } from '../../services/inventoryService';
import { getVehicles } from '../../services/fleetService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { todayStr } from '../../lib/utils';

// Issuance screens for fuel and lubricants already exist — this one covers every other category.
const ISSUABLE_CATEGORIES = ['filters', 'parts-new', 'parts-used', 'battery-new', 'battery-used', 'electrical', 'stationery', 'other'];

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  stockItemId: z.string().min(1, 'Select an item'),
  quantityIssued: z.number({ error: 'Required' }).min(1, 'Must be > 0'),
  issuedTo: z.string().min(1, 'Issued To is required'),
  vehicleNo: z.string().optional(),
  issuingOfficer: z.string().min(1, 'Issuing officer is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ItemIssueFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: todayStr(), quantityIssued: 1, issuingOfficer: user?.email || '' }
  });

  const stockItemId = watch('stockItemId');
  const quantityIssued = watch('quantityIssued') || 0;
  const selectedItem = items.find(i => i.id === stockItemId);
  const closingStock = selectedItem ? Math.max(0, (selectedItem.currentStock || 0) - quantityIssued) : undefined;

  useEffect(() => {
    const load = async () => {
      const [allItems, v] = await Promise.all([getInventoryItems(), getVehicles()]);
      setItems((allItems || []).filter(i => ISSUABLE_CATEGORIES.includes(i.category)));
      setVehicles(v || []);
    };
    load();
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      await createItemIssue({
        date: data.date,
        stockItemId: data.stockItemId,
        itemName: selectedItem.name,
        category: selectedItem.category,
        unitType: selectedItem.unitType,
        quantityIssued: data.quantityIssued,
        issuedTo: data.issuedTo,
        vehicleNo: data.vehicleNo,
        issuingOfficer: data.issuingOfficer,
        notes: data.notes,
      }, user?.email || 'System');
      navigate('/inventory', { state: { tab: 'items' } });
    } catch (err) {
      console.error(err);
      alert('Failed to record item issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inventory')}
          className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader title="Issue Item" subtitle="Issue a stock item to a department, person, or vehicle" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-8 shadow-xl shadow-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
            <input type="date" {...register('date')} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm [color-scheme:light] shadow-sm" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Issuing Officer</label>
            <input type="text" {...register('issuingOfficer')} placeholder="Officer Name" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm shadow-sm" />
            {errors.issuingOfficer && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.issuingOfficer.message}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package className="w-3 h-3 text-indigo-600" />
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</label>
          </div>
          <Controller
            control={control}
            name="stockItemId"
            render={({ field }) => (
              <SearchableSelect
                options={items.map(i => ({ value: i.id!, label: i.name, subLabel: `${CATEGORY_LABELS[i.category] || i.category} • ${i.currentStock} ${i.unitType} in stock` }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select item to issue"
                icon={<Package className="w-4 h-4 text-indigo-600" />}
              />
            )}
          />
          {errors.stockItemId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.stockItemId.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Quantity to Issue {selectedItem && <span className="text-gray-300">({selectedItem.unitType})</span>}
            </label>
            <input type="number" step="1" min="1" {...register('quantityIssued', { valueAsNumber: true })} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-mono font-black text-gray-900 text-sm shadow-sm" />
            {errors.quantityIssued && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.quantityIssued.message}</p>}
            {closingStock !== undefined && (
              <p className={closingStock <= (selectedItem?.minStockLevel || 0) ? "text-[10px] font-bold text-rose-500 px-1" : "text-[10px] font-bold text-emerald-600 px-1"}>
                Remaining after issue: {closingStock} {selectedItem?.unitType}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <User className="w-3 h-3 text-indigo-600" />
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issued To</label>
            </div>
            <input type="text" {...register('issuedTo')} placeholder="Department or person name" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm shadow-sm" />
            {errors.issuedTo && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.issuedTo.message}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Truck className="w-3 h-3 text-indigo-600" />
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle <span className="text-gray-300">(Optional)</span></label>
          </div>
          <Controller
            control={control}
            name="vehicleNo"
            render={({ field }) => (
              <SearchableSelect
                options={vehicles.map(v => ({ value: v.plateNo, label: v.plateNo, subLabel: v.type }))}
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Select vehicle (if the item is for one)"
                icon={<Truck className="w-4 h-4 text-indigo-600" />}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Notes <span className="text-gray-300">(Optional)</span></label>
          <textarea {...register('notes')} rows={3} placeholder="Reason / remarks" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm resize-none shadow-sm" />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedItem}
          className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          {loading ? <LoadingSpinner /> : (<><Save className="w-4 h-4" /> Commit Issue</>)}
        </button>
      </form>
    </div>
  );
};

export default ItemIssueFormPage;
