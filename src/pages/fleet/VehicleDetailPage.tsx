import React, { useEffect, useState } from 'react';
import {
   Truck,
   Settings,
   Fuel,
   ShieldCheck,
   History,
   Wrench,
   ChevronRight,
   ArrowLeft,
   Calendar,
   Weight,
   Maximize,
   AlertTriangle,
   Globe,
   User,
   MapPin,
   CreditCard,
   Building,
   FileText,
   ExternalLink,
   Download
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getVehicle, Vehicle } from '../../services/fleetService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

const VehicleDetailPage: React.FC = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [vehicle, setVehicle] = useState<Vehicle | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (id) {
         const fetchVehicle = async () => {
            try {
               const data = await getVehicle(id);
               setVehicle(data);
            } catch (err) {
               console.error(err);
            } finally {
               setLoading(false);
            }
         };
         fetchVehicle();
      }
   }, [id]);

   if (loading) return <LoadingSpinner />;
   if (!vehicle) return <div className="text-center py-20 font-black text-gray-400 uppercase tracking-widest">Asset Not Found</div>;

   const statusColors = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      maintenance: 'bg-amber-50 text-amber-600 border-amber-100',
      unavailable: 'bg-rose-50 text-rose-600 border-rose-100',
   };

   const typeIcons = {
      'freezer-truck': <Truck className="w-5 h-5" />,
      'dry-truck': <Truck className="w-5 h-5" />,
      'lorry': <Truck className="w-5 h-5" />,
      'other': <Settings className="w-5 h-5" />,
   };

   return (
      <div className="space-y-8 pb-20">
         <div className="flex items-center gap-4">
            <button
               onClick={() => navigate('/fleet')}
               className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <PageHeader
               title={vehicle.plateNo}
               subtitle={`${vehicle.make || ''} ${vehicle.model || ''}`}
            />
            <div className="ml-auto">
               <span className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                  statusColors[vehicle.status as keyof typeof statusColors]
               )}>
                  {vehicle.status}
               </span>
            </div>
         </div>

         {/* Hero Section with Images */}
         {vehicle.vehicleImages && vehicle.vehicleImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {vehicle.vehicleImages.map((img, i) => (
                  <motion.div
                     key={i}
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.1 }}
                     className="aspect-video rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl"
                  >
                     <img src={img} alt="Vehicle" className="w-full h-full object-cover" />
                  </motion.div>
               ))}
            </div>
         ) : (
            <div className="bg-gray-50 h-48 rounded-[2.5rem] border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
               <Truck className="w-16 h-16 opacity-20" />
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Technical Specification Dossier */}
            <div className="lg:col-span-2 space-y-8">
               <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Settings className="w-32 h-32 text-indigo-600" />
                  </div>

                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                     <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                     Technical Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <Settings className="w-5 h-5 text-gray-400" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Category</p>
                              <p className="text-sm font-bold text-gray-900 uppercase">{vehicle.type.replace('-', ' ')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <Fuel className="w-5 h-5 text-amber-600" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fuel Infrastructure</p>
                              <p className="text-sm font-bold text-gray-900 uppercase">{vehicle.fuelType}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <ShieldCheck className="w-5 h-5 text-indigo-600" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chassis Number</p>
                              <p className="text-sm font-bold text-gray-900 font-mono">{vehicle.chassisNo || 'NOT RECORDED'}</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <Calendar className="w-5 h-5 text-emerald-600" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manuf. / Reg. Date</p>
                              <p className="text-sm font-bold text-gray-900">
                                 {vehicle.dateOfManufacture || '---'} / {vehicle.dateOfRegistration || '---'}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <Globe className="w-5 h-5 text-indigo-600" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Country of Origin</p>
                              <p className="text-sm font-bold text-gray-900">{vehicle.countryOfOrigin || 'NOT RECORDED'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl">
                              <Truck className="w-5 h-5 text-gray-400" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engine Serial</p>
                              <p className="text-sm font-bold text-gray-900 font-mono">{vehicle.engineNo || 'NOT RECORDED'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>

               <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl">
                  {(() => {
                     const dims = vehicle.dimensions?.internal || {};
                     const unit = (vehicle.dimensions?.unit || 'ft').toUpperCase();
                     return (
                  <>
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Capacity & Dimensions</h3>
                     {vehicle.dimensions?.internal?.cbm ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">CBM: {vehicle.dimensions.internal.cbm} m³</span>
                     ) : null}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                     <div className="p-6 bg-gray-50 rounded-3xl text-center">
                        <Maximize className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Length</p>
                        <p className="text-xl font-black text-gray-900">{dims.length || 0} <span className="text-[10px] text-gray-400">{unit}</span></p>
                     </div>
                     <div className="p-6 bg-gray-50 rounded-3xl text-center">
                        <Maximize className="w-5 h-5 text-indigo-600 mx-auto mb-2 rotate-90" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Width</p>
                        <p className="text-xl font-black text-gray-900">{dims.width || 0} <span className="text-[10px] text-gray-400">{unit}</span></p>
                     </div>
                     <div className="p-6 bg-gray-50 rounded-3xl text-center">
                        <Maximize className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Height</p>
                        <p className="text-xl font-black text-gray-900">{dims.height || 0} <span className="text-[10px] text-gray-400">{unit}</span></p>
                     </div>
                     <div className="p-6 bg-indigo-600 rounded-3xl text-center text-white shadow-lg shadow-indigo-100">
                        <Weight className="w-5 h-5 text-indigo-200 mx-auto mb-2" />
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Capacity</p>
                        <p className="text-xl font-black">{vehicle.weightCapacity || 0} <span className="text-[10px] text-indigo-200">TONS</span></p>
                     </div>
                  </div>
                  </>
                     );
                  })()}
               </section>
            </div>

            {/* Ownership & Compliance Sidecard */}
            <div className="space-y-8">
               <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
                  <div className={cn(
                     "absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-[0.2em]",
                     vehicle.ownership === 'owned' ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                  )}>
                     {vehicle.ownership} asset
                  </div>

                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Ownership Records</h3>

                  {vehicle.ownership === 'owned' ? (
                     <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                           <ShieldCheck className="w-5 h-5 text-emerald-600" />
                           <p className="text-xs font-bold text-emerald-700">Internal Asset - Fully Managed</p>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           {(() => {
                              const od = vehicle.ownerDetails;
                              const OWNERSHIP_LABEL: Record<string, string> = {
                                 'sole-proprietor': 'Sole Proprietor',
                                 'single-owner': 'Single Owner',
                                 'private-limited': 'Private Limited',
                              };
                              const Row = ({ label, value }: { label: string; value?: string }) =>
                                 value ? (
                                    <div>
                                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                       <p className="text-sm font-bold text-gray-900 break-words">{value}</p>
                                    </div>
                                 ) : null;
                              return (
                                 <>
                                    <Row label="Contract Owner" value={od?.ownerName || 'Unknown'} />
                                    <Row label="Known As" value={od?.ownerNickname} />
                                    <Row label="Business Name" value={od?.businessName} />
                                    <Row label="Ownership Type" value={od?.ownershipType ? (OWNERSHIP_LABEL[od.ownershipType] || od.ownershipType) : undefined} />
                                    <Row label="NIC" value={od?.ownerNicBr || '---'} />
                                    <Row label="BR Number" value={od?.brNumber} />
                                    <Row label="Address" value={od?.ownerAddress} />
                                 </>
                              );
                           })()}
                           <div className="pt-4 border-t border-gray-50">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Legal Documents</p>
                              <div className="grid grid-cols-1 gap-2">
                                 {vehicle.ownerDetails?.contractPdfUrl && (
                                    <a href={vehicle.ownerDetails.contractPdfUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all group">
                                       <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-indigo-600" />
                                          <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-indigo-600">Lease Agreement</span>
                                       </div>
                                       <Download className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />
                                    </a>
                                 )}
                                 {vehicle.ownerDetails?.brDocumentUrl && (
                                    <a href={vehicle.ownerDetails.brDocumentUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50 rounded-xl transition-all group">
                                       <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-amber-600" />
                                          <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-amber-600">BR Document</span>
                                       </div>
                                       <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-amber-400" />
                                    </a>
                                 )}
                                 {vehicle.ownerDetails?.idCopyUrl && (
                                    <a href={vehicle.ownerDetails.idCopyUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all group">
                                       <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-indigo-600" />
                                          <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-indigo-600">ID Copy</span>
                                       </div>
                                       <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />
                                    </a>
                                 )}
                                 {vehicle.ownerDetails?.handoverConditionReport && (
                                    <a href={vehicle.ownerDetails.handoverConditionReport} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl transition-all group">
                                       <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-emerald-600" />
                                          <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-emerald-600">Handover Report</span>
                                       </div>
                                       <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-emerald-400" />
                                    </a>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </section>

               {vehicle.ownership === 'rented' && vehicle.ownerDetails && (
                  <section className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl">
                     <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4">Financial Protocol</h3>
                     <div className="space-y-4">
                        <div>
                           <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Payment Model</p>
                           <p className="text-sm font-bold text-gray-900 capitalize">{(vehicle.ownerDetails.paymentModel || '').replace(/-/g, ' ')}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Rate (LKR)</p>
                           <p className="text-xl font-black text-emerald-700">{(vehicle.ownerDetails.paymentRate ?? 0).toLocaleString()}</p>
                        </div>

                        {/* Monthly rental configuration */}
                        {vehicle.ownerDetails.paymentModel === 'monthly' && vehicle.ownerDetails.monthlyConfig && (
                           <div className="pt-4 border-t border-emerald-100 grid grid-cols-3 gap-3">
                              <div>
                                 <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Fixed (LKR)</p>
                                 <p className="text-xs font-black text-gray-900">{(vehicle.ownerDetails.monthlyConfig.fixedAmount ?? 0).toLocaleString()}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">KM Limit</p>
                                 <p className="text-xs font-black text-gray-900">{(vehicle.ownerDetails.monthlyConfig.kmLimit ?? 0).toLocaleString()}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Extra/KM</p>
                                 <p className="text-xs font-black text-gray-900">{(vehicle.ownerDetails.monthlyConfig.extraKmRate ?? 0).toLocaleString()}</p>
                              </div>
                           </div>
                        )}

                        <div className="pt-4 border-t border-emerald-100">
                           <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Agreement Cycle</p>
                           <p className="text-xs font-bold text-gray-600">
                              {vehicle.ownerDetails.agreementStart || '---'} TO {vehicle.ownerDetails.agreementEnd || '---'}
                           </p>
                        </div>

                        {/* Bank details */}
                        {(vehicle.ownerDetails.bankName || vehicle.ownerDetails.accountNumber || vehicle.ownerDetails.bankDetails) && (
                           <div className="pt-4 border-t border-emerald-100 space-y-1">
                              <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Bank Details</p>
                              {vehicle.ownerDetails.bankName && (
                                 <p className="text-xs font-bold text-gray-900">
                                    {vehicle.ownerDetails.bankName}{vehicle.ownerDetails.bankBranch ? ` · ${vehicle.ownerDetails.bankBranch}` : ''}
                                 </p>
                              )}
                              {vehicle.ownerDetails.accountNumber && (
                                 <p className="text-xs font-mono font-bold text-gray-600">A/C {vehicle.ownerDetails.accountNumber}</p>
                              )}
                              {!vehicle.ownerDetails.bankName && vehicle.ownerDetails.bankDetails && (
                                 <p className="text-xs font-bold text-gray-600">{vehicle.ownerDetails.bankDetails}</p>
                              )}
                           </div>
                        )}
                     </div>
                  </section>
               )}
            </div>
         </div>
      </div>
   );
};

export default VehicleDetailPage;
