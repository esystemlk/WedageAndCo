import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Truck, 
  FileText, 
  ChevronRight,
  Calendar,
  DollarSign,
  Package,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserMinus,
  Briefcase,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getGatePasses, GatePass } from '../../services/gatePassService';
import { getVehicles } from '../../services/fleetService';
import { getSuppliers } from '../../services/supplierService';
import { 
  getSecurityBillChecks, 
  createSecurityBillCheck, 
  deleteSecurityBillCheck, 
  SecurityBillCheck 
} from '../../services/securityBillService';
import { 
  getVisitorLogs, 
  createVisitorLog, 
  updateVisitorLog, 
  deleteVisitorLog, 
  VisitorLog 
} from '../../services/visitorLogService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../contexts/AuthContext';

// Zod schema for Bill Verification
const billCheckSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  targetType: z.enum(['Vehicle', 'Stores']),
  vehicleNo: z.string().optional(),
  supplierName: z.string().min(1, 'Supplier is required'),
  description: z.string().min(1, 'Description is required'),
  units: z.number().min(1, 'Units must be at least 1'),
  invoiceNo: z.string().min(1, 'Invoice Number is required'),
  price: z.number().min(0, 'Price must be positive'),
}).refine(data => {
  if (data.targetType === 'Vehicle' && !data.vehicleNo?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Vehicle selection is required",
  path: ["vehicleNo"]
});

type BillCheckFormData = z.infer<typeof billCheckSchema>;

// Zod schema for Visitor & External Registry
const visitorSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  visitorName: z.string().min(1, 'Visitor Name is required'),
  organization: z.string().optional().or(z.literal('')),
  visitorType: z.enum(['Business Partner', 'Individual', 'Vehicle Owner', 'Other']),
  nicNumber: z.string().optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number is required'),
  vehicleNo: z.string().optional().or(z.literal('')),
  vehicleType: z.string().optional().or(z.literal('')),
  purpose: z.string().min(1, 'Purpose of visit is required'),
  timeIn: z.string().min(1, 'Arrival time is required'),
  hostName: z.string().min(1, 'Person to meet is required'),
  status: z.enum(['On-site', 'Checked Out']),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

const GatePassListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'passes' | 'bills' | 'visitors'>('passes');
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [billChecks, setBillChecks] = useState<SecurityBillCheck[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Open' | 'Returned' | 'Cancelled'>('All');
  const [visitorFilter, setVisitorFilter] = useState<'All' | 'On-site' | 'Checked Out'>('All');
  
  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visitorDrawerOpen, setVisitorDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Hook-form for Bills verification
  const { 
    register: registerBill, 
    handleSubmit: handleSubmitBill, 
    setValue: setBillValue, 
    watch: watchBill, 
    reset: resetBill, 
    formState: { errors: billErrors } 
  } = useForm<BillCheckFormData>({
    resolver: zodResolver(billCheckSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      targetType: 'Vehicle',
      units: 1,
      price: 0
    }
  });

  // Hook-form for Visitors
  const { 
    register: registerVisitor, 
    handleSubmit: handleSubmitVisitor, 
    setValue: setVisitorValue, 
    watch: watchVisitor, 
    reset: resetVisitor, 
    formState: { errors: visitorErrors } 
  } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      visitorType: 'Individual',
      status: 'On-site',
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      organization: '',
      nicNumber: '',
      vehicleNo: '',
      vehicleType: ''
    }
  });

  const watchTargetType = watchBill('targetType');
  const watchUnits = watchBill('units') || 0;
  const watchPrice = watchBill('price') || 0;
  const watchVisitorType = watchVisitor('visitorType');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [passesData, billsData, fleetData, suppliersData, visitorData] = await Promise.all([
        getGatePasses(),
        getSecurityBillChecks(),
        getVehicles(),
        getSuppliers(),
        getVisitorLogs()
      ]);
      setGatePasses(passesData || []);
      setBillChecks(billsData || []);
      setVehicles(fleetData || []);
      setSuppliers(suppliersData || []);
      setVisitorLogs(visitorData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBillCheck = async (data: BillCheckFormData) => {
    try {
      setDrawerLoading(true);
      const payload = {
        ...data,
        enteredBy: user?.email || 'System Security'
      };
      await createSecurityBillCheck(payload);
      resetBill({
        date: new Date().toISOString().split('T')[0],
        targetType: 'Vehicle',
        units: 1,
        price: 0
      });
      setDrawerOpen(false);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to log security bill check');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDeleteBillCheck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this security bill check record?')) {
      try {
        await deleteSecurityBillCheck(id);
        await loadAllData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete security record');
      }
    }
  };

  const handleCreateVisitorLog = async (data: VisitorFormData) => {
    try {
      setDrawerLoading(true);
      await createVisitorLog(data);
      resetVisitor({
        date: new Date().toISOString().split('T')[0],
        visitorType: 'Individual',
        status: 'On-site',
        timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        visitorName: '',
        organization: '',
        nicNumber: '',
        phone: '',
        vehicleNo: '',
        vehicleType: '',
        purpose: '',
        hostName: ''
      });
      setVisitorDrawerOpen(false);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to register visitor log');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleVisitorCheckout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const timeOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateVisitorLog(id, {
        status: 'Checked Out',
        timeOut
      });
      await loadAllData();
      alert('Visitor successfully checked out!');
    } catch (err) {
      console.error(err);
      alert('Failed to check out visitor.');
    }
  };

  const handleDeleteVisitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this visitor record?')) {
      try {
        await deleteVisitorLog(id);
        await loadAllData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete visitor log');
      }
    }
  };

  const filteredPasses = gatePasses.filter(gp => {
    const matchesSearch = gp.gatePassNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         gp.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gp.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (gp.customerName && gp.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'All' || gp.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filteredBills = billChecks.filter(b => {
    return b.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           b.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (b.vehicleNo && b.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
           b.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredVisitors = visitorLogs.filter(v => {
    const matchesSearch = v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.phone.includes(searchQuery) ||
                          (v.organization && v.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (v.vehicleNo && v.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          v.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = visitorFilter === 'All' || v.status === visitorFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10 group/page pb-20 relative">
      <PageHeader 
        title="Security Command Book" 
        subtitle="Gate Exit Passes, External Visitors, and Yard store verification registry"
      />

      {/* Modern Premium Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto gap-4 scrollbar-none">
        <button 
          onClick={() => { setActiveTab('passes'); setSearchQuery(''); }}
          className={cn(
            "pb-4 px-6 text-xs font-black uppercase tracking-[0.25em] transition-all relative shrink-0",
            activeTab === 'passes' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400 hover:text-gray-900"
          )}
        >
          Vehicle Gate Exit Passes
          {gatePasses.filter(p => p.status === 'Open').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[8px] font-black tracking-tight">
              {gatePasses.filter(p => p.status === 'Open').length} ACTIVE
            </span>
          )}
        </button>
        
        <button 
          onClick={() => { setActiveTab('visitors'); setSearchQuery(''); }}
          className={cn(
            "pb-4 px-6 text-xs font-black uppercase tracking-[0.25em] transition-all relative shrink-0",
            activeTab === 'visitors' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400 hover:text-gray-900"
          )}
        >
          Visitor & External Vehicles
          {visitorLogs.filter(v => v.status === 'On-site').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black tracking-tight">
              {visitorLogs.filter(v => v.status === 'On-site').length} ON-SITE
            </span>
          )}
        </button>

        <button 
          onClick={() => { setActiveTab('bills'); setSearchQuery(''); }}
          className={cn(
            "pb-4 px-6 text-xs font-black uppercase tracking-[0.25em] transition-all relative shrink-0",
            activeTab === 'bills' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400 hover:text-gray-900"
          )}
        >
          Goods Inward verification
          <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black tracking-tight">
            {billChecks.length} LOGS
          </span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-600 w-4 h-4 transition-colors" />
            <input 
              type="text" 
              placeholder={
                activeTab === 'passes' ? "Search Pass, Vehicle, Driver..." : 
                activeTab === 'visitors' ? "Search Visitor, Org, External Vehicle..." :
                "Search Invoice, Supplier, Vehicle..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-full pl-11 pr-5 py-3 text-xs w-72 focus:outline-none focus:border-indigo-500/30 focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400 shadow-sm"
            />
          </div>
          
          {activeTab === 'passes' && (
            <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-full">
              {['All', 'Open', 'Returned'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    filter === s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'visitors' && (
            <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-full">
              {['All', 'On-site', 'Checked Out'].map((s) => (
                <button
                  key={s}
                  onClick={() => setVisitorFilter(s as any)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    visitorFilter === s ? "bg-amber-600 text-white shadow-lg shadow-amber-100" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'passes' ? (
          <button 
            onClick={() => navigate('/security/new')}
            className="group/btn bg-indigo-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
            Issue Gate Pass
          </button>
        ) : activeTab === 'visitors' ? (
          <button 
            onClick={() => {
              resetVisitor({
                date: new Date().toISOString().split('T')[0],
                visitorType: 'Individual',
                status: 'On-site',
                timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                visitorName: '',
                organization: '',
                nicNumber: '',
                phone: '',
                vehicleNo: '',
                vehicleType: '',
                purpose: '',
                hostName: ''
              });
              setVisitorDrawerOpen(true);
            }}
            className="group/btn bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-amber-500/20 flex items-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
            Log Visitor / External
          </button>
        ) : (
          <button 
            onClick={() => setDrawerOpen(true)}
            className="group/btn bg-emerald-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
            Log Bill Check
          </button>
        )}
      </div>

      {activeTab === 'passes' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 text-[10px] uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-10 py-6 font-black">Pass Details</th>
                  <th className="px-10 py-6 font-black">Vehicle & Crew</th>
                  <th className="px-10 py-6 font-black">Timeline & Invoice</th>
                  <th className="px-10 py-6 font-black text-center">Status</th>
                  <th className="px-10 py-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode='popLayout'>
                  {filteredPasses.map((gp, i) => (
                     <motion.tr 
                      key={gp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-gray-50 transition-all cursor-pointer"
                      onClick={() => navigate(`/security/${gp.id}`)}
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100 group-hover:scale-110 transition-transform shadow-sm">
                            {gp.gatePassNo}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Ref: {gp.linkedLogSheetNo}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Customer: {gp.customerName || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">{gp.vehicleNo}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">D: {gp.driverName}</p>
                            {gp.helperName && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">H: {gp.helperName}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Out: {gp.timeOut}</span>
                          </div>
                          {gp.invoiceNotAvailable ? (
                            <span className="px-2 py-0.5 text-[8px] bg-rose-50 text-rose-600 font-black rounded border border-rose-100 uppercase tracking-wider">
                              No Invoice: {gp.invoiceReason || 'N/A'}
                            </span>
                          ) : (
                            gp.invoiceNo && (
                              <span className="px-2 py-0.5 text-[8px] bg-indigo-50 text-indigo-600 font-black rounded border border-indigo-100 uppercase tracking-wider">
                                Invoice: {gp.invoiceNo}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex flex-col items-center gap-2">
                            <span className={cn(
                              "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-sm",
                              gp.status === 'Open' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              gp.status === 'Returned' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              "bg-rose-50 text-rose-600 border border-rose-100"
                            )}>
                              {gp.status}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-2 h-2 rounded-full", gp.managerApproved ? "bg-emerald-500" : "bg-gray-200")} title={gp.managerApproved ? "Manager Approved" : "Manager Pending"}></span>
                              <span className={cn("w-2 h-2 rounded-full", gp.securityApproved ? "bg-indigo-500" : "bg-gray-200")} title={gp.securityApproved ? "Security Approved" : "Security Pending"}></span>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/security/${gp.id}/edit`);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                         </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {filteredPasses.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                <ShieldCheck className="w-8 h-8 text-gray-200" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Security Records Found</p>
                <p className="text-[10px] text-gray-400 font-medium italic">All vehicle movements are strictly monitored via gate passes.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visitors tab */}
      {activeTab === 'visitors' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 text-[10px] uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-10 py-6 font-black">Visitor Details</th>
                  <th className="px-10 py-6 font-black">External Vehicle</th>
                  <th className="px-10 py-6 font-black">Purpose & Host</th>
                  <th className="px-10 py-6 font-black">Arrival & Exit</th>
                  <th className="px-10 py-6 font-black text-center">Status</th>
                  <th className="px-10 py-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode='popLayout'>
                  {filteredVisitors.map((v, i) => (
                    <motion.tr 
                      key={v.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-gray-50 transition-all text-xs"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border shadow-sm",
                            v.status === 'On-site' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-gray-50 text-gray-400 border-gray-100"
                          )}>
                            {v.visitorName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{v.visitorName}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{v.organization || 'Individual'}</p>
                            <p className="text-[9px] text-indigo-500 font-mono mt-0.5">{v.phone} {v.nicNumber ? `• NIC: ${v.nicNumber}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        {v.vehicleNo ? (
                          <div className="space-y-1">
                            <span className="px-2 py-1 bg-gray-100 border border-gray-250 rounded font-mono font-black text-gray-700 text-[10px]">
                              {v.vehicleNo}
                            </span>
                            {v.vehicleType && (
                              <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider">{v.vehicleType}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-gray-300 italic uppercase">Walk-in</span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                        <div>
                          <p className="font-bold text-gray-800 line-clamp-1">{v.purpose}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Host: {v.hostName}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6 font-mono text-[10px] text-gray-600">
                        <p><span className="font-bold text-emerald-600">In:</span> {v.timeIn}</p>
                        {v.timeOut ? (
                          <p><span className="font-bold text-rose-600">Out:</span> {v.timeOut}</p>
                        ) : (
                          <p className="text-amber-500 font-bold animate-pulse">On-site</p>
                        )}
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                          v.status === 'On-site' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-gray-50 text-gray-400 border-gray-150"
                        )}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {v.status === 'On-site' && (
                            <button
                              onClick={(e) => handleVisitorCheckout(v.id!, e)}
                              className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-600 transition-colors rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                              title="Checkout Visitor"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Checkout
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDeleteVisitor(v.id!, e)}
                            className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                            title="Delete Visitor Log"
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

          {filteredVisitors.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                <UserCheck className="w-8 h-8 text-gray-200" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Visitor Logs Found</p>
                <p className="text-[10px] text-gray-400 font-medium italic">Record all external business partners, meetings, individual visitors, or vehicle owners.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 text-[10px] uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-10 py-6 font-black">Date & Target</th>
                  <th className="px-10 py-6 font-black">Supplier & Description</th>
                  <th className="px-10 py-6 font-black text-right">Qty / Rate</th>
                  <th className="px-10 py-6 font-black text-right">Total Amount</th>
                  <th className="px-10 py-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode='popLayout'>
                  {filteredBills.map((b, i) => (
                    <motion.tr 
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-gray-50 transition-all"
                    >
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-900">{b.date}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            b.targetType === 'Vehicle' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                          )}>
                            {b.targetType === 'Vehicle' ? `Vehicle: ${b.vehicleNo}` : 'Stores Inward'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{b.supplierName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{b.description}</p>
                          <span className="px-2 py-0.5 text-[8px] bg-emerald-50 text-emerald-600 font-black rounded border border-emerald-100 uppercase tracking-wider">
                            Invoice: {b.invoiceNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <p className="text-xs font-bold text-gray-900">{b.units} Units</p>
                        <p className="text-[10px] text-gray-400 font-bold font-mono">@ LKR {b.price.toLocaleString()}</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <p className="text-sm font-black text-emerald-600 font-mono">LKR {(b.totalAmount || (b.units * b.price)).toLocaleString()}</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button 
                          onClick={(e) => handleDeleteBillCheck(b.id, e)}
                          className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredBills.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                <DollarSign className="w-8 h-8 text-gray-200" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Security Bills Checked</p>
                <p className="text-[10px] text-gray-400 font-medium italic">Enforce goods security logs for all store & yard supplier inwards.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sleek Right Side Slide-over Drawer for adding Security Bills Verification */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 p-10 flex flex-col h-full overflow-hidden"
            >
              <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Log Bill Check</h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase mt-0.5 tracking-wider">Gate Inward Security Verification</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBill(handleCreateBillCheck)} className="flex-1 overflow-y-auto py-8 space-y-8 custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Verification Date</label>
                  <input 
                    type="date" 
                    {...registerBill('date')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm shadow-sm"
                  />
                  {billErrors.date && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.date.message}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Target Classification</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={cn(
                      "flex items-center justify-center gap-3 p-4 rounded-2xl border text-xs font-black uppercase tracking-wider cursor-pointer transition-all",
                      watchTargetType === 'Vehicle' ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50"
                    )}>
                      <input 
                        type="radio" 
                        value="Vehicle" 
                        {...registerBill('targetType')} 
                        className="hidden" 
                      />
                      <Truck className="w-4 h-4" />
                      Vehicle No
                    </label>
                    <label className={cn(
                      "flex items-center justify-center gap-3 p-4 rounded-2xl border text-xs font-black uppercase tracking-wider cursor-pointer transition-all",
                      watchTargetType === 'Stores' ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" : "bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50"
                    )}>
                      <input 
                        type="radio" 
                        value="Stores" 
                        {...registerBill('targetType')} 
                        className="hidden" 
                      />
                      <Package className="w-4 h-4" />
                      Yard / Stores
                    </label>
                  </div>
                </div>

                {watchTargetType === 'Vehicle' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Fleet Vehicle</label>
                    <select 
                      {...registerBill('vehicleNo')}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="" className="bg-white">Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.plateNo} className="bg-white">{v.plateNo} - {v.type}</option>
                      ))}
                    </select>
                    {billErrors.vehicleNo && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.vehicleNo.message}</p>}
                  </motion.div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Supplier name</label>
                  <select 
                    {...registerBill('supplierName')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.nickname || s.name} className="bg-white">{s.nickname || s.name}</option>
                    ))}
                  </select>
                  {billErrors.supplierName && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.supplierName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice Number</label>
                    <input 
                      type="text" 
                      {...registerBill('invoiceNo')}
                      placeholder="e.g. INV-9024"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm shadow-sm"
                    />
                    {billErrors.invoiceNo && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.invoiceNo.message}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Units / Qty</label>
                    <input 
                      type="number" 
                      {...registerBill('units', { valueAsNumber: true })}
                      placeholder="1"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-mono font-black text-gray-900 text-sm shadow-sm"
                    />
                    {billErrors.units && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.units.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Price (Rate per Unit)</label>
                    <input 
                      type="number" 
                      {...registerBill('price', { valueAsNumber: true })}
                      placeholder="0"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-mono font-black text-gray-900 text-sm shadow-sm"
                    />
                    {billErrors.price && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.price.message}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Computed Amount</label>
                    <div className="w-full px-6 py-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl font-mono font-black text-emerald-600 text-sm shadow-sm flex items-center">
                      LKR {(watchUnits * watchPrice).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Goods Description / Remarks</label>
                  <textarea 
                    {...registerBill('description')}
                    rows={3}
                    placeholder="e.g. 5 boxes of spare oil filters for yard"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-900 text-sm resize-none shadow-sm"
                  />
                  {billErrors.description && <p className="text-[10px] font-bold text-rose-600 px-1">{billErrors.description.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={drawerLoading}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-emerald-100 active:scale-95"
                >
                  {drawerLoading ? <LoadingSpinner /> : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Commit Verification log
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sleek Right Side Slide-over Drawer for adding Visitors & Externals */}
      <AnimatePresence>
        {visitorDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVisitorDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 p-10 flex flex-col h-full overflow-hidden"
            >
              <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Log Visitor / External</h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase mt-0.5 tracking-wider">Yard Visitor & External Vehicle Entry</p>
                  </div>
                </div>
                <button 
                  onClick={() => setVisitorDrawerOpen(false)}
                  className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitVisitor(handleCreateVisitorLog)} className="flex-1 overflow-y-auto py-8 space-y-6 custom-scrollbar text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Entry Date</label>
                    <input 
                      type="date" 
                      {...registerVisitor('date')}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                    />
                    {visitorErrors.date && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.date.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Arrival Time</label>
                    <input 
                      type="text" 
                      {...registerVisitor('timeIn')}
                      placeholder="e.g. 10:30 AM"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                    />
                    {visitorErrors.timeIn && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.timeIn.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Visitor Classification</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Individual', 'Business Partner', 'Vehicle Owner', 'Other'] as const).map(type => (
                      <label key={type} className={cn(
                        "flex items-center justify-center p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all",
                        watchVisitorType === type ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-gray-50/50 border-gray-100 text-gray-450 hover:bg-gray-50"
                      )}>
                        <input 
                          type="radio" 
                          value={type} 
                          {...registerVisitor('visitorType')} 
                          className="hidden" 
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Visitor / Driver Full Name</label>
                  <input 
                    type="text" 
                    {...registerVisitor('visitorName')}
                    placeholder="Enter full name..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                  />
                  {visitorErrors.visitorName && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.visitorName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      type="text" 
                      {...registerVisitor('phone')}
                      placeholder="e.g. 0771234567"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-mono font-bold text-gray-900 shadow-sm"
                    />
                    {visitorErrors.phone && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">NIC Number</label>
                    <input 
                      type="text" 
                      {...registerVisitor('nicNumber')}
                      placeholder="e.g. 19950821033"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-mono font-bold text-gray-900 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Represented Organization / Business</label>
                  <input 
                    type="text" 
                    {...registerVisitor('organization')}
                    placeholder="e.g. Keells Super / Individual if none"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                  />
                </div>

                {/* External Vehicle Info (Optional) */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-[10px] font-black text-gray-450 uppercase tracking-widest">External Vehicle details (if applicable)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vehicle Plate No</label>
                      <input 
                        type="text" 
                        {...registerVisitor('vehicleNo')}
                        placeholder="e.g. WP CAA-9031"
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none font-mono font-bold text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vehicle Type / Brand</label>
                      <input 
                        type="text" 
                        {...registerVisitor('vehicleType')}
                        placeholder="e.g. Toyota KDH / Lorry"
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none font-bold text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Host / Person to meet</label>
                    <input 
                      type="text" 
                      {...registerVisitor('hostName')}
                      placeholder="e.g. MD / Operations Lead"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                    />
                    {visitorErrors.hostName && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.hostName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Initial Status</label>
                    <select
                      {...registerVisitor('status')}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 shadow-sm"
                    >
                      <option value="On-site">On-site (Checked In)</option>
                      <option value="Checked Out">Checked Out</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Purpose of Visit / Talk</label>
                  <textarea 
                    {...registerVisitor('purpose')}
                    rows={3}
                    placeholder="e.g. Business discussion / purchase meeting / vehicle sales talk..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-900 resize-none shadow-sm"
                  />
                  {visitorErrors.purpose && <p className="text-[9px] font-bold text-rose-600">{visitorErrors.purpose.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={drawerLoading}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-amber-100 active:scale-95"
                >
                  {drawerLoading ? <LoadingSpinner /> : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Commit Visitor Log
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GatePassListPage;
