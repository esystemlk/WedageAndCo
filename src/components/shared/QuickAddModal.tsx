import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Truck, User, Building2, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { createVehicle } from '../../services/fleetService';
import { FUEL_TYPE_VALUES, FUEL_TYPE_LABELS, FuelType } from '../../config/fuelTypes';
import { getCustomFuelTypes, CustomFuelType } from '../../services/configService';
import { createSupplier } from '../../services/supplierService';
import { createCustomer } from '../../services/customerService';
import { createStaffMember } from '../../services/staffService';
import { cn } from '../../lib/utils';

export type QuickAddType = 'vehicle' | 'supplier' | 'customer' | 'driver' | 'helper' | 'staff';

interface QuickAddModalProps {
  type: QuickAddType;
  onCreated: (id: string, label: string) => void;
  onClose: () => void;
}

const LABELS: Record<QuickAddType, string> = {
  vehicle: 'Add New Vehicle',
  supplier: 'Add New Supplier',
  customer: 'Add New Customer',
  driver: 'Add New Driver',
  helper: 'Add New Helper',
  staff: 'Add New Staff Member',
};

const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400 transition-all";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest";

const QuickAddModal: React.FC<QuickAddModalProps> = ({ type, onCreated, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Vehicle fields
  const [plateNo, setPlateNo] = useState('');
  const [vType, setVType] = useState<'freezer-truck' | 'dry-truck' | 'lorry' | 'other'>('dry-truck');
  const [fuelType, setFuelType] = useState<FuelType | string>('diesel');
  const [customFuelTypes, setCustomFuelTypes] = useState<CustomFuelType[]>([]);

  // Load custom fuel types on mount
  React.useEffect(() => {
    getCustomFuelTypes().then(setCustomFuelTypes);
  }, []);
  const [ownership, setOwnership] = useState<'owned' | 'rented'>('owned');

  // Supplier fields
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [officialContact, setOfficialContact] = useState('');
  const [customerType, setCustomerType] = useState<'permanent' | 'temporary'>('permanent');
  const [paysVat, setPaysVat] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
  const [agreementStart, setAgreementStart] = useState(today);
  const [agreementEnd, setAgreementEnd] = useState(nextYear);

  // Staff / Driver / Helper fields
  const [fullName, setFullName] = useState('');
  const [staffCategory, setStaffCategory] = useState<'Driver' | 'Helper' | 'Cleaner' | 'Office Staff' | 'Garage'>(
    type === 'driver' ? 'Driver' : type === 'helper' ? 'Helper' : 'Driver'
  );
  const [staffPhone, setStaffPhone] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [department, setDepartment] = useState('Operations');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      let newId: string | undefined;
      let label = '';

      if (type === 'vehicle') {
        if (!plateNo.trim()) { setError('Plate number is required'); setSaving(false); return; }
        newId = await createVehicle({ plateNo: plateNo.trim().toUpperCase(), type: vType, fuelType, ownership, status: 'active' });
        label = plateNo.trim().toUpperCase();
      } else if (type === 'supplier') {
        if (!supplierName.trim()) { setError('Business name is required'); setSaving(false); return; }
        if (!supplierPhone.trim()) { setError('Phone number is required'); setSaving(false); return; }
        newId = await createSupplier({ name: supplierName.trim(), phone: supplierPhone.trim(), email: supplierEmail.trim() });
        label = supplierName.trim();
      } else if (type === 'customer') {
        if (!customerName.trim()) { setError('Customer name is required'); setSaving(false); return; }
        if (!officialContact.trim()) { setError('Contact number is required'); setSaving(false); return; }
        newId = await createCustomer({
          name: customerName.trim(),
          brNo: '—',
          officialContact: officialContact.trim(),
          customerType,
          paysVat,
          agreementStart,
          agreementEnd,
        });
        label = customerName.trim();
      } else {
        // driver, helper, or generic staff
        if (!fullName.trim()) { setError('Full name is required'); setSaving(false); return; }
        if (!staffPhone.trim()) { setError('Phone number is required'); setSaving(false); return; }
        const category = type === 'driver' ? 'Driver' : type === 'helper' ? 'Helper' : staffCategory;
        newId = await createStaffMember({
          fullName: fullName.trim(),
          category,
          phone: staffPhone.trim(),
          nicNumber: nicNumber.trim() || 'TBD',
          active: true,
          department: department.trim() || 'Operations',
        });
        label = fullName.trim();
      }

      if (!newId) throw new Error('Record was created but no ID was returned');
      onCreated(newId, label);
    } catch (err: any) {
      setError(err?.message || 'Failed to create record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const iconMap: Record<QuickAddType, React.ReactNode> = {
    vehicle: <Truck className="w-5 h-5 text-indigo-600" />,
    supplier: <Package className="w-5 h-5 text-emerald-600" />,
    customer: <Building2 className="w-5 h-5 text-blue-600" />,
    driver: <User className="w-5 h-5 text-violet-600" />,
    helper: <User className="w-5 h-5 text-amber-600" />,
    staff: <User className="w-5 h-5 text-indigo-600" />,
  };

  const modal = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {iconMap[type]}
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{LABELS[type]}</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Quick Create — Add to system &amp; select</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 max-h-[55vh] overflow-y-auto">

          {/* ─── Vehicle Form ─── */}
          {type === 'vehicle' && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Plate Number *</label>
                <input value={plateNo} onChange={e => setPlateNo(e.target.value)} placeholder="e.g. WP ABC-1234" className={fieldCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Vehicle Type *</label>
                  <select value={vType} onChange={e => setVType(e.target.value as any)} className={fieldCls}>
                    <option value="dry-truck">Dry Truck</option>
                    <option value="freezer-truck">Freezer Truck</option>
                    <option value="lorry">Lorry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Fuel Type *</label>
                  <select value={fuelType} onChange={e => setFuelType(e.target.value)} className={fieldCls}>
                    {FUEL_TYPE_VALUES.map(ft => (
                      <option key={ft} value={ft}>{FUEL_TYPE_LABELS[ft]}</option>
                    ))}
                    {customFuelTypes.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Ownership *</label>
                <select value={ownership} onChange={e => setOwnership(e.target.value as any)} className={fieldCls}>
                  <option value="owned">Company Owned</option>
                  <option value="rented">Rented / Contracted</option>
                </select>
              </div>
            </>
          )}

          {/* ─── Supplier Form ─── */}
          {type === 'supplier' && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Business Name *</label>
                <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. ABC Auto Parts (Pvt) Ltd" className={fieldCls} autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Phone Number *</label>
                <input value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="e.g. 077 123 4567" className={fieldCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Email Address <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                <input value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="e.g. info@supplier.lk" className={fieldCls} type="email" />
              </div>
            </>
          )}

          {/* ─── Customer Form ─── */}
          {type === 'customer' && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Business / Customer Name *</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Cargills Food City" className={fieldCls} autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Official Contact Number *</label>
                <input value={officialContact} onChange={e => setOfficialContact(e.target.value)} placeholder="e.g. 011 234 5678" className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Customer Type *</label>
                  <select value={customerType} onChange={e => setCustomerType(e.target.value as any)} className={fieldCls}>
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Pays VAT</label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" checked={paysVat} onChange={e => setPaysVat(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-bold text-gray-700">{paysVat ? 'Yes — VAT Registered' : 'No VAT'}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Agreement Start *</label>
                  <input type="date" value={agreementStart} onChange={e => setAgreementStart(e.target.value)} className={cn(fieldCls, "[color-scheme:light]")} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Agreement End *</label>
                  <input type="date" value={agreementEnd} onChange={e => setAgreementEnd(e.target.value)} className={cn(fieldCls, "[color-scheme:light]")} />
                </div>
              </div>
            </>
          )}

          {/* ─── Driver / Helper / Staff Form ─── */}
          {(type === 'driver' || type === 'helper' || type === 'staff') && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Full Name *</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Nuwan Kumara Perera" className={fieldCls} autoFocus />
              </div>
              {type === 'staff' ? (
                <div className="space-y-1.5">
                  <label className={labelCls}>Category *</label>
                  <select value={staffCategory} onChange={e => setStaffCategory(e.target.value as any)} className={fieldCls}>
                    <option value="Driver">Driver</option>
                    <option value="Helper">Helper</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Office Staff">Office Staff</option>
                    <option value="Garage">Garage</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className={labelCls}>Category</label>
                  <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-sm font-black text-indigo-700 uppercase tracking-wider">
                      {type === 'driver' ? '🚛  Driver' : '🧑‍🤝‍🧑  Helper'}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className={labelCls}>Phone Number *</label>
                <input value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="e.g. 077 123 4567" className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>NIC Number <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                  <input value={nicNumber} onChange={e => setNicNumber(e.target.value)} placeholder="e.g. 990123456V" className={fieldCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Department</label>
                  <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Operations" className={fieldCls} />
                </div>
              </div>
            </>
          )}

          {/* Error banner */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create &amp; Select
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};

export default QuickAddModal;
