import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package, Save, Tag, MapPin, Truck, DollarSign, Calendar,
  Fuel, Droplets, Filter, Zap, Battery, FileText, Archive,
  RefreshCw, BarChart2, AlertCircle, Plus, X, Check
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import {
  createInventoryItem, updateInventoryItem, getInventoryItem,
  InventoryCategory, CATEGORY_LABELS, SUB_CATEGORIES
} from '../../services/inventoryService';
import { FUEL_TYPE_VALUES, FUEL_TYPE_LABELS } from '../../config/fuelTypes';
import {
  getCustomCategories, addCustomCategory, getCustomFuelTypes, addCustomFuelType,
  CustomCategory, CustomFuelType
} from '../../services/configService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const numOpt = z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined));

const schema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  unitType: z.string().min(1, 'Unit type is required'),
  openingStock: numOpt,
  currentStock: numOpt,
  minStockLevel: numOpt,
  maxStockLevel: numOpt,
  reorderQuantity: numOpt,
  purchaseCost: numOpt,
  averageCost: numOpt,
  issueRate: numOpt,
  supplierName: z.string().optional(),
  supplierContact: z.string().optional(),
  datePurchased: z.string().optional(),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  warehouseLocation: z.string().optional(),
  binRackNumber: z.string().optional(),
  notes: z.string().optional(),
  extended: z.object({
    fuelType: z.string().optional(),
    tankCapacityL: numOpt,
    oilGrade: z.string().optional(),
    compatibleVehicleTypes: z.string().optional(),
    packSize: z.string().optional(),
    filterType: z.string().optional(),
    compatibleVehicleModel: z.string().optional(),
    oemPartNumber: z.string().optional(),
    alternativePartNumber: z.string().optional(),
    serviceIntervalKm: numOpt,
    partNumber: z.string().optional(),
    isOEM: z.boolean().optional(),
    vehicleCompatibility: z.string().optional(),
    warrantyPeriod: z.string().optional(),
    warrantyExpiry: z.string().optional(),
    serialNumber: z.string().optional(),
    sourceVehicle: z.string().optional(),
    conditionGrade: z.enum(['A','B','C']).optional(),
    testedStatus: z.enum(['tested-ok','untested','faulty']).optional(),
    estimatedRemainingLife: z.string().optional(),
    isRefurbished: z.boolean().optional(),
    refurbishmentCost: numOpt,
    removalDate: z.string().optional(),
    batteryCapacityAh: numOpt,
    voltage: numOpt,
    manufactureDate: z.string().optional(),
    warrantyStart: z.string().optional(),
    warrantyEnd: z.string().optional(),
    installedVehicle: z.string().optional(),
    chargingStatus: z.string().optional(),
    terminalType: z.string().optional(),
    testVoltageReading: numOpt,
    electricalType: z.string().optional(),
    voltageRating: z.string().optional(),
    ampRating: z.string().optional(),
    connectorType: z.string().optional(),
    wireGauge: z.string().optional(),
    itemSpecification: z.string().optional(),
    departmentIssuedTo: z.string().optional(),
    approvalRequired: z.boolean().optional(),
    monthlyUsageRate: numOpt,
  }).optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORY_ICONS: Record<string, any> = {
  'fuel': Fuel, 'lubricants': Droplets, 'filters': Filter,
  'parts-new': Archive, 'parts-used': RefreshCw,
  'battery-new': Battery, 'battery-used': Battery,
  'electrical': Zap, 'stationery': FileText, 'other': Package,
};

const UNIT_TYPES = ['Litres', 'mL', 'Kg', 'Grams', 'Pieces', 'Sets', 'Boxes', 'Packets', 'Reams', 'Rolls', '200L Barrel', '500mL Bottle', '1L Bottle', '4L Container', '20L Container'];

const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest px-1";

const InventoryItemFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  // Custom categories & fuel types loaded from Firestore
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customFuelTypes, setCustomFuelTypes] = useState<CustomFuelType[]>([]);

  // Inline "Add Category" form state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubcats, setNewCatSubcats] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Inline "Add Fuel Type" form state
  const [addingFuel, setAddingFuel] = useState(false);
  const [newFuelName, setNewFuelName] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      category: 'other',
      openingStock: 0,
      currentStock: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      reorderQuantity: 0,
      purchaseCost: 0,
      averageCost: 0,
      issueRate: 0,
    }
  });

  const category = watch('category') as InventoryCategory;
  const currentStock = watch('currentStock') || 0;
  const maxStockLevel = watch('maxStockLevel') || 0;
  const minStockLevel = watch('minStockLevel') || 0;

  // Load custom config from Firestore on mount
  useEffect(() => {
    getCustomCategories().then(setCustomCategories);
    getCustomFuelTypes().then(setCustomFuelTypes);
  }, []);

  useEffect(() => {
    if (id) {
      getInventoryItem(id).then(data => {
        if (data) {
          Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'sku' && key !== 'stockStatus' && key !== 'createdAt' && key !== 'updatedAt') {
              setValue(key as any, (data as any)[key]);
            }
          });
        }
        setInitialLoading(false);
      });
    }
  }, [id, setValue]);

  // Merge built-in + custom categories for the selector
  const allCategories = [
    ...Object.keys(CATEGORY_LABELS).map(v => ({
      value: v,
      label: CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS],
      subCategories: (SUB_CATEGORIES as Record<string, string[]>)[v] || [],
      isCustom: false,
    })),
    ...customCategories.map(c => ({
      value: c.value,
      label: c.label,
      subCategories: c.subCategories,
      isCustom: true,
    })),
  ];

  // Merge built-in + custom fuel types for the select
  const allFuelTypes = [
    ...FUEL_TYPE_VALUES.map(v => ({ value: v, label: FUEL_TYPE_LABELS[v] })),
    ...customFuelTypes.map(ft => ({ value: ft.value, label: ft.label })),
  ];

  // Handle adding a new custom category
  const handleAddCategory = async () => {
    const label = newCatName.trim();
    if (!label) return;
    setSavingCat(true);
    try {
      const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const skuPrefix = label.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'CUST';
      const subs = newCatSubcats.trim()
        ? newCatSubcats.split(',').map(s => s.trim()).filter(Boolean)
        : ['General'];
      const saved = await addCustomCategory({ value, label, skuPrefix, subCategories: subs });
      setCustomCategories(prev => [...prev, saved]);
      setValue('category', saved.value);
      setValue('subCategory', '');
      setAddingCategory(false);
      setNewCatName('');
      setNewCatSubcats('');
    } finally {
      setSavingCat(false);
    }
  };

  // Handle adding a new custom fuel type
  const handleAddFuelType = async () => {
    const label = newFuelName.trim();
    if (!label) return;
    setSavingFuel(true);
    try {
      const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const shortLabel = label.length > 10 ? label.slice(0, 9).trim() + '…' : label;
      const saved = await addCustomFuelType({ value, label, shortLabel });
      setCustomFuelTypes(prev => [...prev, saved]);
      setAddingFuel(false);
      setNewFuelName('');
    } finally {
      setSavingFuel(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        openingStock: data.openingStock || 0,
        currentStock: data.currentStock || 0,
        minStockLevel: data.minStockLevel || 0,
        maxStockLevel: data.maxStockLevel || 0,
        reorderQuantity: data.reorderQuantity || 0,
        purchaseCost: data.purchaseCost || 0,
        averageCost: data.averageCost || 0,
        issueRate: data.issueRate || 0,
        supplierName: data.supplierName || '',
        supplierContact: data.supplierContact || '',
        datePurchased: data.datePurchased || '',
        warehouseLocation: data.warehouseLocation || '',
        brand: data.brand || '',
        subCategory: data.subCategory || '',
        lastUpdatedBy: user?.email || 'system',
      };
      if (id) {
        await updateInventoryItem(id, payload as any);
        toast.success('Item updated', `${(data as any).name || 'Item'} was saved.`);
      } else {
        await createInventoryItem(payload as any);
        toast.success('Item created', `${(data as any).name || 'Item'} was added to inventory.`);
      }
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      toast.error('Save failed', 'Could not save the inventory item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  const CatIcon = CATEGORY_ICONS[category] || Package;
  const selectedCatObj = allCategories.find(c => c.value === category);
  const subCats = selectedCatObj?.subCategories || [];
  const stockPct = maxStockLevel > 0 ? Math.min(100, (currentStock / maxStockLevel) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={id ? 'Edit Stock Item' : 'Add Stock Item'}
        subtitle={id ? 'Update item details and stock levels' : 'Register a new item in the inventory system'}
        back="/inventory"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Package className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">

          {/* Category Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Stock Category</label>
              <span className="text-[9px] text-gray-400 font-bold">{allCategories.length} categories</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {allCategories.map(cat => {
                const Icon = CATEGORY_ICONS[cat.value] || Package;
                return (
                  <button key={cat.value} type="button"
                    onClick={() => { setValue('category', cat.value); setValue('subCategory', ''); }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                      category === cat.value
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100"
                        : cat.isCustom
                          ? "bg-violet-50 border-violet-200 text-violet-600 hover:border-violet-400"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}

              {/* ── Add new category ── */}
              {!addingCategory ? (
                <button type="button" onClick={() => setAddingCategory(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Type
                </button>
              ) : null}
            </div>

            {/* Inline add-category form */}
            {addingCategory && (
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-3">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">New Stock Category</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Category name (e.g. Tyres, Chemicals, Tools)"
                    className="flex-1 px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-400"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                      if (e.key === 'Escape') { setAddingCategory(false); setNewCatName(''); setNewCatSubcats(''); }
                    }}
                  />
                  <button type="button" onClick={handleAddCategory}
                    disabled={!newCatName.trim() || savingCat}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {savingCat ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {savingCat ? 'Saving…' : 'Add'}
                  </button>
                  <button type="button"
                    onClick={() => { setAddingCategory(false); setNewCatName(''); setNewCatSubcats(''); }}
                    className="px-3 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newCatSubcats}
                  onChange={e => setNewCatSubcats(e.target.value)}
                  placeholder="Sub-categories (comma separated, optional) — e.g. Radial, Bias-ply, Winter, All-season"
                  className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold outline-none placeholder:text-gray-400"
                />
                <p className="text-[9px] text-indigo-500 font-bold">Leave sub-categories blank for a single "General" bucket.</p>
              </div>
            )}
          </div>

          {/* Core Identity */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Item Identity</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className={labelCls}>Item Name *</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-4 h-4" />
                  <input {...register('name')} placeholder="e.g. Shell Helix 15W40 Engine Oil"
                    className={cn(fieldCls, "pl-11", errors.name && "border-red-400")} />
                </div>
                {errors.name && <p className="text-[10px] font-bold text-red-500 px-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Brand / Manufacturer</label>
                <input {...register('brand')} placeholder="e.g. Shell, Castrol" className={fieldCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Sub-Category</label>
                <select {...register('subCategory')} className={cn(fieldCls, "appearance-none cursor-pointer")}>
                  <option value="">Select...</option>
                  {subCats.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Unit Type *</label>
                <select {...register('unitType')} className={cn(fieldCls, "appearance-none cursor-pointer", errors.unitType && "border-red-400")}>
                  <option value="">Select unit...</option>
                  {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="other">Other</option>
                </select>
                {errors.unitType && <p className="text-[10px] font-bold text-red-500 px-1">{errors.unitType.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Batch / Serial No.</label>
                <input {...register('batchNumber')} placeholder="Batch or serial number" className={fieldCls} />
              </div>
            </div>
          </div>

          {/* Stock Levels */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Stock Levels</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* Live stock bar */}
            {maxStockLevel > 0 && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</span>
                  <span className={cn("text-[10px] font-black uppercase",
                    stockPct <= (minStockLevel / maxStockLevel * 100) ? 'text-amber-600' : 'text-emerald-600'
                  )}>
                    {currentStock} / {maxStockLevel}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full",
                      stockPct <= 20 ? 'bg-red-500' : stockPct <= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${stockPct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
              {[
                { name: 'openingStock', label: 'Opening Stock', color: 'text-blue-600' },
                { name: 'currentStock', label: 'Current Stock', color: 'text-indigo-600' },
                { name: 'minStockLevel', label: 'Min Stock Level', color: 'text-amber-600' },
                { name: 'maxStockLevel', label: 'Max Stock Level', color: 'text-emerald-600' },
                { name: 'reorderQuantity', label: 'Reorder Qty', color: 'text-violet-600' },
              ].map(f => (
                <div key={f.name} className="space-y-2">
                  <label className={cn(labelCls, f.color)}>{f.label}</label>
                  <input type="number" step="0.01" {...register(f.name as any, { valueAsNumber: true })}
                    placeholder="0" className={cn(fieldCls, "bg-white")} />
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Pricing & Costing</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'purchaseCost', label: 'Purchase Cost (LKR)' },
                { name: 'averageCost', label: 'Average Cost (LKR)' },
                { name: 'issueRate', label: 'Issue / Selling Rate (LKR)' },
              ].map(f => (
                <div key={f.name} className="space-y-2">
                  <label className={labelCls}>{f.label}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="number" step="0.01" {...register(f.name as any, { valueAsNumber: true })}
                      placeholder="0.00" className={cn(fieldCls, "pl-9")} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier & Purchase */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Supplier & Procurement</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className={labelCls}>Supplier Name</label>
                <input {...register('supplierName')} placeholder="Supplier company name" className={fieldCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Supplier Contact</label>
                <input {...register('supplierContact')} placeholder="Phone / email" className={fieldCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Date Purchased</label>
                <input type="date" {...register('datePurchased')} className={fieldCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Expiry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="date" {...register('expiryDate')} className={cn(fieldCls, "pl-9")} />
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Physical Location</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelCls}>Warehouse / Storage Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input {...register('warehouseLocation')} placeholder="e.g. Main Store, Workshop" className={cn(fieldCls, "pl-9")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Bin / Rack Number</label>
                <input {...register('binRackNumber')} placeholder="e.g. Shelf A-3, Rack B" className={fieldCls} />
              </div>
            </div>
          </div>

          {/* Category-specific extended fields */}
          {category === 'fuel' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-amber-50 rounded-[2rem] border border-amber-100"
            >
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Fuel Configuration</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={cn(labelCls, "text-amber-600")}>Fuel Type</label>
                    {!addingFuel && (
                      <button type="button" onClick={() => setAddingFuel(true)}
                        className="text-[9px] font-black text-amber-600 hover:text-amber-700 flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Plus className="w-3 h-3" /> Add Type
                      </button>
                    )}
                  </div>
                  {addingFuel ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFuelName}
                        onChange={e => setNewFuelName(e.target.value)}
                        placeholder="New fuel type name…"
                        className="flex-1 px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddFuelType(); }
                          if (e.key === 'Escape') { setAddingFuel(false); setNewFuelName(''); }
                        }}
                      />
                      <button type="button" onClick={handleAddFuelType}
                        disabled={!newFuelName.trim() || savingFuel}
                        className="px-3 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-black disabled:opacity-40"
                      >{savingFuel ? '…' : <Check className="w-3.5 h-3.5" />}</button>
                      <button type="button" onClick={() => { setAddingFuel(false); setNewFuelName(''); }}
                        className="px-3 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <select {...register('extended.fuelType')} className={cn(fieldCls, "bg-white border-amber-200 appearance-none")}>
                      <option value="">Select...</option>
                      {allFuelTypes.map(ft => (
                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-amber-600")}>Tank Capacity (Litres)</label>
                  <input type="number" step="0.1" {...register('extended.tankCapacityL', { valueAsNumber: true })}
                    placeholder="e.g. 5000" className={cn(fieldCls, "bg-white border-amber-200")} />
                </div>
              </div>
            </motion.div>
          )}

          {category === 'lubricants' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-cyan-50 rounded-[2rem] border border-cyan-100"
            >
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Oil / Lubricant Specs</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-cyan-600")}>Oil Grade</label>
                  <input {...register('extended.oilGrade')} placeholder="e.g. 15W40, ATF Dexron III"
                    className={cn(fieldCls, "bg-white border-cyan-200")} />
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-cyan-600")}>Compatible Vehicle Types</label>
                  <input {...register('extended.compatibleVehicleTypes')} placeholder="e.g. All diesel engines"
                    className={cn(fieldCls, "bg-white border-cyan-200")} />
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-cyan-600")}>Pack Size</label>
                  <input {...register('extended.packSize')} placeholder="e.g. 1L, 4L, 20L drum"
                    className={cn(fieldCls, "bg-white border-cyan-200")} />
                </div>
              </div>
            </motion.div>
          )}

          {category === 'filters' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-violet-50 rounded-[2rem] border border-violet-100"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-violet-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Filter Specifications</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'extended.filterType', label: 'Filter Type', placeholder: 'Oil / Air / Fuel / Cabin' },
                  { name: 'extended.compatibleVehicleModel', label: 'Compatible Model', placeholder: 'e.g. TATA Prima' },
                  { name: 'extended.oemPartNumber', label: 'OEM Part Number', placeholder: 'OEM ref' },
                  { name: 'extended.alternativePartNumber', label: 'Alt. Part Number', placeholder: 'Aftermarket ref' },
                ].map(f => (
                  <div key={f.name} className="space-y-2">
                    <label className={cn(labelCls, "text-violet-600")}>{f.label}</label>
                    <input {...register(f.name as any)} placeholder={f.placeholder} className={cn(fieldCls, "bg-white border-violet-200")} />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-violet-600")}>Service Interval (KM)</label>
                  <input type="number" {...register('extended.serviceIntervalKm', { valueAsNumber: true })}
                    placeholder="e.g. 5000" className={cn(fieldCls, "bg-white border-violet-200")} />
                </div>
              </div>
            </motion.div>
          )}

          {category === 'parts-new' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100"
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Brand New Part Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'extended.partNumber', label: 'Part Number', placeholder: 'Manufacturer part no.' },
                  { name: 'extended.vehicleCompatibility', label: 'Vehicle Compatibility', placeholder: 'e.g. TATA 1510, All models' },
                  { name: 'extended.warrantyPeriod', label: 'Warranty Period', placeholder: 'e.g. 12 months' },
                  { name: 'extended.warrantyExpiry', label: 'Warranty Expiry', type: 'date' },
                  { name: 'extended.serialNumber', label: 'Serial Number', placeholder: 'If applicable' },
                ].map(f => (
                  <div key={f.name} className="space-y-2">
                    <label className={cn(labelCls, "text-indigo-600")}>{f.label}</label>
                    <input type={f.type || 'text'} {...register(f.name as any)} placeholder={f.placeholder}
                      className={cn(fieldCls, "bg-white border-indigo-200")} />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-indigo-600")}>OEM Part</label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-indigo-200 rounded-xl cursor-pointer">
                    <input type="checkbox" {...register('extended.isOEM')} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">OEM / Genuine Part</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {category === 'parts-used' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-orange-50 rounded-[2rem] border border-orange-100"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Second-hand Part Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Source Vehicle</label>
                  <input {...register('extended.sourceVehicle')} placeholder="e.g. WP CAA-1234"
                    className={cn(fieldCls, "bg-white border-orange-200")} />
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Condition Grade</label>
                  <select {...register('extended.conditionGrade')} className={cn(fieldCls, "bg-white border-orange-200 appearance-none")}>
                    <option value="">Select grade...</option>
                    <option value="A">A — Excellent</option>
                    <option value="B">B — Good</option>
                    <option value="C">C — Fair</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Tested Status</label>
                  <select {...register('extended.testedStatus')} className={cn(fieldCls, "bg-white border-orange-200 appearance-none")}>
                    <option value="">Select...</option>
                    <option value="tested-ok">Tested — OK</option>
                    <option value="untested">Untested</option>
                    <option value="faulty">Faulty</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Est. Remaining Life</label>
                  <input {...register('extended.estimatedRemainingLife')} placeholder="e.g. 6–12 months"
                    className={cn(fieldCls, "bg-white border-orange-200")} />
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Removal Date</label>
                  <input type="date" {...register('extended.removalDate')} className={cn(fieldCls, "bg-white border-orange-200")} />
                </div>
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-orange-600")}>Refurbished</label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-orange-200 rounded-xl cursor-pointer">
                    <input type="checkbox" {...register('extended.isRefurbished')} className="w-4 h-4 text-orange-500 rounded" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Has been refurbished</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {(category === 'battery-new' || category === 'battery-used') && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-yellow-50 rounded-[2rem] border border-yellow-100"
            >
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-yellow-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-700">Battery Specifications</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'extended.batteryCapacityAh', label: 'Capacity (Ah)', type: 'number', placeholder: 'e.g. 60' },
                  { name: 'extended.voltage', label: 'Voltage', type: 'number', placeholder: 'e.g. 12 or 24' },
                  { name: 'extended.terminalType', label: 'Terminal Type', placeholder: 'e.g. Top terminal' },
                  { name: 'extended.chargingStatus', label: 'Charging Status', placeholder: 'e.g. Fully charged' },
                  { name: 'extended.testVoltageReading', label: 'Test Voltage (V)', type: 'number', placeholder: 'e.g. 12.6' },
                  { name: 'extended.installedVehicle', label: 'Installed In Vehicle', placeholder: 'If currently in use' },
                  { name: 'extended.manufactureDate', label: 'Manufacture Date', type: 'date' },
                  { name: 'extended.warrantyStart', label: 'Warranty Start', type: 'date' },
                  { name: 'extended.warrantyEnd', label: 'Warranty End', type: 'date' },
                ].map(f => (
                  <div key={f.name} className="space-y-2">
                    <label className={cn(labelCls, "text-yellow-700")}>{f.label}</label>
                    <input type={f.type || 'text'}
                      {...register(f.name as any, f.type === 'number' ? { valueAsNumber: true } : undefined)}
                      placeholder={f.placeholder}
                      className={cn(fieldCls, "bg-white border-yellow-200")} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {category === 'electrical' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-blue-50 rounded-[2rem] border border-blue-100"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Electrical Specifications</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'extended.electricalType', label: 'Type', placeholder: 'Relay / Fuse / Wire / Bulb...' },
                  { name: 'extended.voltageRating', label: 'Voltage Rating', placeholder: 'e.g. 12V, 24V' },
                  { name: 'extended.ampRating', label: 'Amp Rating', placeholder: 'e.g. 10A, 30A' },
                  { name: 'extended.connectorType', label: 'Connector Type', placeholder: 'e.g. JST, Anderson' },
                  { name: 'extended.wireGauge', label: 'Wire Gauge', placeholder: 'e.g. 6mm², 16 AWG' },
                  { name: 'extended.itemSpecification', label: 'Full Specification', placeholder: 'Detailed spec' },
                ].map(f => (
                  <div key={f.name} className="space-y-2">
                    <label className={cn(labelCls, "text-blue-600")}>{f.label}</label>
                    <input {...register(f.name as any)} placeholder={f.placeholder} className={cn(fieldCls, "bg-white border-blue-200")} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {category === 'stationery' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Stationery Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>Department Issued To</label>
                  <input {...register('extended.departmentIssuedTo')} placeholder="e.g. Operations, Accounts"
                    className={fieldCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Monthly Usage Rate</label>
                  <input type="number" {...register('extended.monthlyUsageRate', { valueAsNumber: true })}
                    placeholder="Average monthly usage" className={fieldCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Manager Approval Required</label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer">
                    <input type="checkbox" {...register('extended.approvalRequired')} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Require approval to issue</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className={labelCls}>Notes</label>
            <textarea {...register('notes')} rows={3} placeholder="Any additional notes, observations, or special instructions..."
              className={cn(fieldCls, "resize-none")} />
          </div>

          {/* Submit */}
          <div className="pt-8 border-t border-gray-100 flex items-center justify-end">
            <button type="submit" disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-3 disabled:bg-indigo-200 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Update Item' : 'Register Item'}</span>
                  <Save className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default InventoryItemFormPage;
