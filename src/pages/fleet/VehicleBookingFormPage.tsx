import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarCheck, Truck, User, MapPin, Clock, Save, AlertTriangle,
  CheckCircle2, Users, Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { createBooking, checkVehicleAvailability, VehicleBooking } from '../../services/bookingService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import SearchableSelect from '../../components/shared/SearchableSelect';

const schema = z.object({
  vehiclePlate:   z.string().min(1, 'Vehicle is required'),
  requestedBy:    z.string().min(1, 'Your name is required'),
  purpose:        z.string().min(3, 'Purpose is required'),
  fromDate:       z.string().min(1, 'Start date required'),
  fromTime:       z.string().min(1, 'Start time required'),
  toDate:         z.string().min(1, 'End date required'),
  toTime:         z.string().min(1, 'End time required'),
  destination:    z.string().min(2, 'Destination required'),
  passengerCount: z.number().min(1).optional().or(z.nan().transform(() => undefined)),
  driverRequired: z.boolean().default(false),
  driverName:     z.string().optional(),
  notes:          z.string().optional(),
}).refine(d => d.toDate >= d.fromDate, {
  message: 'End date must be on or after start date',
  path: ['toDate'],
});

type FormData = z.infer<typeof schema>;

const VehicleBookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<VehicleBooking[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const now   = new Date().toTimeString().slice(0,5);

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitted } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      fromDate: today,
      fromTime: now,
      toDate: today,
      driverRequired: false,
      requestedBy: user?.email?.split('@')[0] || '',
    }
  });

  useEffect(() => {
    Promise.all([getVehicles(), getStaffMembers()]).then(([v, s]) => {
      setVehicles(v || []);
      setStaff(s || []);
    });
  }, []);

  const vehiclePlate = watch('vehiclePlate');
  const fromDate     = watch('fromDate');
  const toDate       = watch('toDate');
  const driverRequired = watch('driverRequired');

  // Check availability when vehicle + dates change
  useEffect(() => {
    if (!vehiclePlate || !fromDate || !toDate) return;
    setCheckingAvail(true);
    checkVehicleAvailability(vehiclePlate, fromDate, toDate).then(c => {
      setConflicts(c);
      setCheckingAvail(false);
    });
  }, [vehiclePlate, fromDate, toDate]);

  const onSubmit = async (data: FormData) => {
    if (conflicts.length > 0) {
      setFormError('This vehicle is already booked for the selected period. Please choose different dates or a different vehicle.');
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      await createBooking({ ...data, requestedByEmail: user?.email, status: 'pending' } as any);
      navigate('/fleet/bookings');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit booking request.');
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400";
  const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest px-1";

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="New Booking Request" subtitle="Request a vehicle for a trip or assignment" back="/fleet/bookings" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Banners */}
          {formError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-700">Cannot Submit</p>
                <p className="text-xs text-red-600 mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {isSubmitted && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-black text-amber-700">Please fix the errors below before submitting.</p>
            </div>
          )}

          {/* Vehicle selection */}
          <div className="space-y-6 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Vehicle Selection</span>
            </div>
            <div className="space-y-2">
              <label className={cn(labelCls, "text-indigo-700")}>Select Vehicle *</label>
              <Controller control={control} name="vehiclePlate"
                render={({ field }) => (
                  <SearchableSelect
                    options={vehicles.filter(v => v.status === 'active').map(v => ({
                      value: v.plateNo,
                      label: v.plateNo,
                      subLabel: `${v.type}${v.nickname ? ` · ${v.nickname}` : ''}`,
                    }))}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Select active vehicle..."
                    icon={<Truck className="w-4 h-4 text-indigo-600" />}
                  />
                )}
              />
              {errors.vehiclePlate && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehiclePlate.message}</p>}
              {checkingAvail && <p className="text-[10px] text-indigo-500 font-bold px-1">Checking availability…</p>}
              {!checkingAvail && vehiclePlate && conflicts.length === 0 && fromDate && (
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 px-1">
                  <CheckCircle2 className="w-3 h-3" /> Vehicle available for selected dates
                </p>
              )}
              {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-red-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Conflict — already booked
                  </p>
                  {conflicts.map(c => (
                    <p key={c.id} className="text-[10px] text-red-600">
                      {c.fromDate} {c.fromTime} → {c.toDate} {c.toTime} (by {c.requestedBy}, {c.status})
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trip details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelCls}>Requested By *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('requestedBy')} placeholder="Your full name"
                  className={cn(fieldCls, "pl-10", errors.requestedBy && "border-red-400")} />
              </div>
              {errors.requestedBy && <p className="text-[10px] font-bold text-red-500 px-1">{errors.requestedBy.message}</p>}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Destination *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('destination')} placeholder="e.g. Galle Warehouse"
                  className={cn(fieldCls, "pl-10", errors.destination && "border-red-400")} />
              </div>
              {errors.destination && <p className="text-[10px] font-bold text-red-500 px-1">{errors.destination.message}</p>}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Start Date *</label>
              <input type="date" min={today} {...register('fromDate')}
                className={cn(fieldCls, errors.fromDate && "border-red-400")} />
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Start Time *</label>
              <input type="time" {...register('fromTime')}
                className={cn(fieldCls, errors.fromTime && "border-red-400")} />
            </div>

            <div className="space-y-2">
              <label className={labelCls}>End Date *</label>
              <input type="date" min={fromDate || today} {...register('toDate')}
                className={cn(fieldCls, errors.toDate && "border-red-400")} />
              {errors.toDate && <p className="text-[10px] font-bold text-red-500 px-1">{errors.toDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>End Time *</label>
              <input type="time" {...register('toTime')}
                className={cn(fieldCls, errors.toTime && "border-red-400")} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className={labelCls}>Purpose / Reason *</label>
              <input {...register('purpose')} placeholder="e.g. Customer delivery to Kandy warehouse"
                className={cn(fieldCls, errors.purpose && "border-red-400")} />
              {errors.purpose && <p className="text-[10px] font-bold text-red-500 px-1">{errors.purpose.message}</p>}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Passenger Count</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="number" min="1" {...register('passengerCount', { valueAsNumber: true })}
                  placeholder="1" className={cn(fieldCls, "pl-10")} />
              </div>
            </div>

            {/* Driver toggle */}
            <div className="space-y-2">
              <label className={labelCls}>Driver Required?</label>
              <button type="button"
                onClick={() => setValue('driverRequired', !driverRequired)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  driverRequired
                    ? "bg-violet-50 border-violet-300 text-violet-700"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-black">{driverRequired ? 'Yes — Driver needed' : 'No — Self-driven'}</span>
                </div>
                {driverRequired && <CheckCircle2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Driver selection */}
          {driverRequired && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <label className={labelCls}>Preferred Driver</label>
              <Controller control={control} name="driverName"
                render={({ field }) => (
                  <SearchableSelect
                    options={staff.filter(s => s.category === 'Driver').map(s => ({
                      value: s.fullName, label: s.fullName, subLabel: s.phone
                    }))}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Select driver (optional)"
                    icon={<User className="w-4 h-4 text-violet-600" />}
                  />
                )}
              />
            </motion.div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className={labelCls}>Additional Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any special requirements or instructions…"
              className={cn(fieldCls, "resize-none")} />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 font-bold">
              Your request will be reviewed by a manager. You will be notified once it is approved or rejected.
              Approved bookings are automatically linked to the vehicle calendar.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button type="submit" disabled={loading || conflicts.length > 0}
              className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-black px-10 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/20 group"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>
                    <span className="uppercase tracking-[0.2em] text-xs px-2">Submit Request</span>
                    <Save className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default VehicleBookingFormPage;
