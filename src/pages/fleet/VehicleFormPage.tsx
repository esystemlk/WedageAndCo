import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Truck,
  Settings,
  Fuel,
  ShieldCheck,
  Save,
  Tag,
  Maximize,
  Weight,
  Calendar,
  Globe,
  FileText,
  User,
  MapPin,
  CreditCard,
  Building,
  Thermometer,
  FileCheck,
  ShieldAlert,
  Plus,
  X,
  Check,
  RefreshCw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { getVehicle, createVehicle, updateVehicle } from '../../services/fleetService';
import { FUEL_TYPE_VALUES, FUEL_TYPE_SHORT, FUEL_TYPE_COLOR, FUEL_PILL_IDLE } from '../../config/fuelTypes';
import { getCustomFuelTypes, addCustomFuelType, CustomFuelType } from '../../services/configService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';
import SearchableSelect from '../../components/shared/SearchableSelect';

const vehicleSchema = z.object({
  plateNo: z.string().min(1, 'Plate number is required'),
  nickname: z.string().optional(),
  type: z.enum(['freezer-truck', 'dry-truck', 'lorry', 'other']),
  vehicleSize: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  chassisNo: z.string().optional(),
  engineNo: z.string().optional(),
  fuelType: z.string().min(1, 'Fuel type is required'),
  status: z.enum(['active', 'maintenance', 'unavailable']),
  statusChangeReason: z.string().optional(),
  statusConfirmedBy: z.string().optional(),
  ownership: z.enum(['owned', 'rented']),
  weightCapacity: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),

  dimensions: z.object({
    internal: z.object({
      length: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      width: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      height: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      cbm: z.number().optional()
    }).optional(),
    external: z.object({
      length: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      width: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      height: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
    }).optional()
  }).optional(),

  freezerConfig: z.object({
    minTemp: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
    maxTemp: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined))
  }).optional(),

  options: z.object({
    sideDoor: z.boolean().default(false),
    doubleCompartment: z.boolean().default(false),
    powerGate: z.boolean().default(false),
    pluginOption: z.boolean().default(false),
  }).optional(),

  tyres: z.object({
    front: z.object({
      rimSize: z.string().optional(),
      tyreSize: z.string().optional(),
      numberOfStuds: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
    }).optional(),
    rear: z.object({
      rimSize: z.string().optional(),
      tyreSize: z.string().optional(),
      numberOfStuds: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
    }).optional(),
  }).optional(),

  dateOfManufacture: z.string().optional(),
  dateOfRegistration: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  vehicleImages: z.array(z.string()).optional(),

  vehicleLicenseUrl: z.string().optional(),
  vehicleLicenseExpiry: z.string().optional(),
  insuranceUrl: z.string().optional(),
  insuranceExpiry: z.string().optional(),

  ownerDetails: z.object({
    ownershipType: z.string(),
    ownerNickname: z.string().optional(),
    ownerName: z.string(),
    businessName: z.string().optional(),
    ownerAddress: z.string(),
    ownerNicBr: z.string(),
    brNumber: z.string().optional(),
    paymentModel: z.string(),
    monthlyConfig: z.object({
      fixedAmount: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      kmLimit: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
      extraKmRate: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined))
    }).optional(),
    agreementStart: z.string(),
    agreementEnd: z.string(),
    paymentRate: z.number(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    accountNumber: z.string().optional(),
    bankDetails: z.string().optional(),
    contractPdfUrl: z.string().optional(),
    brDocumentUrl: z.string().optional(),
    idCopyUrl: z.string().optional(),
    handoverConditionReport: z.string().optional(),
  }).optional()
});

const typeLabels: Record<string, string> = {
  'freezer-truck': 'Refrigerated Truck',
  'dry-truck': 'Dry Truck',
  'lorry': 'Lorry',
  'other': 'Other'
};

const vehicleSizes = [
  '6.5ft', '8ft', '10.5ft', '12.5ft', '14.5ft', '15ft', '16.5ft',
  '18.5ft', '19.5ft', '20ft', '22ft', '24ft', '26ft', '28ft',
  '30ft', '32ft', '34ft', '36ft', '38ft', '40ft'
];

const countriesList = [
  "Sri Lanka", "Japan", "India", "Germany", "United Kingdom", "United States", "China", "South Korea",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic (Czechia)",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

type VehicleFormData = z.infer<typeof vehicleSchema>;

const VehicleFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  // Custom fuel types from Firestore
  const [customFuelTypes, setCustomFuelTypes] = useState<CustomFuelType[]>([]);
  const [addingFuel, setAddingFuel] = useState(false);
  const [newFuelName, setNewFuelName] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      type: 'dry-truck',
      fuelType: 'diesel',
      status: 'active',
      ownership: 'owned',
      vehicleImages: []
    }
  });

  const selectedType = watch('type');
  const selectedFuel = watch('fuelType');
  const selectedStatus = watch('status');
  const selectedOwnership = watch('ownership');
  const vehicleImages = watch('vehicleImages') || [];
  const selectedPaymentModel = watch('ownerDetails.paymentModel');
  const selectedOwnershipType = watch('ownerDetails.ownershipType');

  useEffect(() => {
    if (id) {
      const fetchVehicle = async () => {
        try {
          const data = await getVehicle(id);
          if (data) {
            Object.keys(data).forEach(key => {
              if (key !== 'id') {
                setValue(key as any, (data as any)[key]);
              }
            });

            // Backward compat: old flat tyres → front/rear split
            const oldTyres = (data as any).tyres;
            if (oldTyres && !oldTyres.front && (oldTyres.rimSize || oldTyres.tyreSize || oldTyres.numberOfStuds)) {
              setValue('tyres.front', { rimSize: oldTyres.rimSize, tyreSize: oldTyres.tyreSize, numberOfStuds: oldTyres.numberOfStuds });
              setValue('tyres.rear', { rimSize: oldTyres.rimSize, tyreSize: oldTyres.tyreSize, numberOfStuds: oldTyres.numberOfStuds });
            }

            // Backward compat: old bankDetails string → bankName
            const od = (data as any).ownerDetails;
            if (od?.bankDetails && !od?.bankName) {
              setValue('ownerDetails.bankName', od.bankDetails);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchVehicle();
    }
  }, [id, setValue]);

  // Load custom fuel types on mount
  useEffect(() => {
    getCustomFuelTypes().then(setCustomFuelTypes);
  }, []);

  // Merge built-in + custom fuel types
  const allFuelTypes = [
    ...FUEL_TYPE_VALUES.map(v => ({
      value: v,
      shortLabel: FUEL_TYPE_SHORT[v],
      colorClass: FUEL_TYPE_COLOR[v],
      isCustom: false,
    })),
    ...customFuelTypes.map(ft => ({
      value: ft.value,
      shortLabel: ft.shortLabel,
      colorClass: 'bg-violet-50 border-violet-300 text-violet-700',
      isCustom: true,
    })),
  ];

  const handleAddFuel = async () => {
    const label = newFuelName.trim();
    if (!label) return;
    setSavingFuel(true);
    try {
      const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const shortLabel = label.length > 10 ? label.slice(0, 9).trim() + '…' : label;
      const saved = await addCustomFuelType({ value, label, shortLabel });
      setCustomFuelTypes(prev => [...prev, saved]);
      setValue('fuelType', saved.value as any);
      setAddingFuel(false);
      setNewFuelName('');
    } finally {
      setSavingFuel(false);
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    try {
      setLoading(true);

      if (data.dimensions?.internal) {
        const { length, width, height } = data.dimensions.internal;
        if (length && width && height) {
          data.dimensions.internal.cbm = Number(((length * width * height) / 35.315).toFixed(2));
        }
      }

      if (id) {
        await updateVehicle(id, data as any);
      } else {
        await createVehicle(data as any);
      }
      navigate('/fleet');
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={id ? 'Configure Asset Specs' : 'Register New Asset'}
        subtitle={id ? 'Updating mechanical and ownership records.' : 'Expanding fleet capacity with new heavy-duty machinery.'}
        back="/fleet"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Truck className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">

          {/* Primary Identification */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vehicle Plate No.</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('plateNo')}
                    placeholder="WP CAP-1234"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-gray-900 uppercase placeholder:text-gray-400",
                      errors.plateNo && "border-red-500/50"
                    )}
                  />
                </div>
                {errors.plateNo && <p className="mt-1 text-[10px] font-bold text-red-500 px-1 uppercase">{errors.plateNo.message}</p>}
              </div>

              <div className="lg:col-span-1 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nickname (Optional)</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('nickname')}
                    placeholder="e.g. Big Blue"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Asset Classification</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['freezer-truck', 'dry-truck', 'lorry', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('type', type)}
                      className={cn(
                        "px-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all truncate",
                        selectedType === type ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vehicle Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vehicle / Box Size</label>
                <select
                  {...register('vehicleSize')}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Select size...</option>
                  {vehicleSizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Pictures */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vehicle Pictures</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {vehicleImages.map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={url} alt={`Vehicle ${i}`} className="w-full h-full object-cover rounded-2xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setValue('vehicleImages', vehicleImages.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
              <FileUpload
                path="fleet/images"
                onUploadComplete={(url) => setValue('vehicleImages', [...vehicleImages, url])}
                showPreview={false}
              />
            </div>
          </div>

          {/* Vehicle Documents */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Vehicle Documents</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Vehicle License */}
              <div className="space-y-4 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Vehicle License</span>
                </div>
                <FileUpload
                  label="Upload Vehicle License"
                  path="fleet/documents/license"
                  accept="image/*,application/pdf"
                  onUploadComplete={(url) => setValue('vehicleLicenseUrl', url)}
                  currentUrl={watch('vehicleLicenseUrl')}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    <label className="text-[10px] font-bold text-blue-600/70 uppercase tracking-tighter">License Expiry Date</label>
                  </div>
                  <input
                    {...register('vehicleLicenseExpiry')}
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none transition-all font-bold text-gray-900 text-sm"
                  />
                </div>
              </div>

              {/* Insurance */}
              <div className="space-y-4 p-6 bg-violet-50 rounded-[2rem] border border-violet-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-violet-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Insurance</span>
                </div>
                <FileUpload
                  label="Upload Insurance Document"
                  path="fleet/documents/insurance"
                  accept="image/*,application/pdf"
                  onUploadComplete={(url) => setValue('insuranceUrl', url)}
                  currentUrl={watch('insuranceUrl')}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-3 h-3 text-violet-500" />
                    <label className="text-[10px] font-bold text-violet-600/70 uppercase tracking-tighter">Insurance Expiry Date</label>
                  </div>
                  <input
                    {...register('insuranceExpiry')}
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:ring-1 focus:ring-violet-500/50 outline-none transition-all font-bold text-gray-900 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mechanical Specs */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Mechanical Infrastructure</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Make / Manufacturer</label>
                <input {...register('make')} placeholder="e.g. TATA" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Model Series</label>
                <input {...register('model')} placeholder="e.g. Prima 4028.S" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Chassis Serial</label>
                <input {...register('chassisNo')} placeholder="M-123456789" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Engine Code</label>
                <input {...register('engineNo')} placeholder="E-987654321" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Date of Manufacture</label>
                <input {...register('dateOfManufacture')} type="date" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Date of Registration</label>
                <input {...register('dateOfRegistration')} type="date" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Country of Origin</label>
                <Controller
                  control={control}
                  name="countryOfOrigin"
                  render={({ field }) => (
                    <SearchableSelect
                      options={countriesList.map(c => ({ value: c, label: c }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Country"
                      icon={<Globe className="w-4 h-4 text-gray-400" />}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Logistics Specs */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Logistics & Load Specs</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            {/* Internal Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
              <div className="lg:col-span-4 flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Internal Dimensions (Loadable Space)</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                  CBM: {(() => {
                    const l = watch('dimensions.internal.length') || 0;
                    const w = watch('dimensions.internal.width') || 0;
                    const h = watch('dimensions.internal.height') || 0;
                    const cbm = (l * w * h) / 35.315;
                    return cbm.toFixed(2);
                  })()} m³
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Maximize className="w-3 h-3 text-gray-400" />
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Length (FT)</label>
                </div>
                <input type="number" step="0.01" {...register('dimensions.internal.length', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Maximize className="w-3 h-3 text-gray-400 rotate-90" />
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Width (FT)</label>
                </div>
                <input type="number" step="0.01" {...register('dimensions.internal.width', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Maximize className="w-3 h-3 text-gray-400" />
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Height (FT)</label>
                </div>
                <input type="number" step="0.01" {...register('dimensions.internal.height', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Weight className="w-3 h-3 text-gray-400" />
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Max Capacity (Tons)</label>
                </div>
                <input type="number" step="0.1" {...register('weightCapacity', { valueAsNumber: true })} placeholder="0.0" className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
            </div>

            {/* External Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 rounded-[2rem] border border-gray-100">
              <div className="lg:col-span-3 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">External Dimensions (Overall Size)</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Ext. Length (FT)</label>
                <input type="number" step="0.01" {...register('dimensions.external.length', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Ext. Width (FT)</label>
                <input type="number" step="0.01" {...register('dimensions.external.width', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Ext. Height (FT)</label>
                <input type="number" step="0.01" {...register('dimensions.external.height', { valueAsNumber: true })} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
              </div>
            </div>

            {/* Temperature Range (Refrigerated Trucks) */}
            {selectedType === 'freezer-truck' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cyan-50 p-6 rounded-[2rem] border border-cyan-100">
                <div className="md:col-span-2 flex items-center gap-2 mb-2">
                  <Thermometer className="w-4 h-4 text-cyan-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Temperature Range</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-cyan-700 uppercase tracking-tighter px-1">Minimum Temp (°C)</label>
                  <input type="number" step="1" {...register('freezerConfig.minTemp', { valueAsNumber: true })} placeholder="-20" className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-bold text-cyan-900 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-cyan-700 uppercase tracking-tighter px-1">Maximum Temp (°C)</label>
                  <input type="number" step="1" {...register('freezerConfig.maxTemp', { valueAsNumber: true })} placeholder="5" className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-bold text-cyan-900 text-sm" />
                </div>
              </motion.div>
            )}

            {/* Vehicle Options & Tyres */}
            <div className="flex items-center gap-4 mt-8">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Vehicle Options & Tyres</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="space-y-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
              {/* Options */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block">Available Options</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'sideDoor', label: 'Side Door' },
                    { id: 'doubleCompartment', label: 'Double Compartment' },
                    { id: 'powerGate', label: 'PowerGate' },
                    { id: 'pluginOption', label: 'Plugin Option' }
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                      <input type="checkbox" {...register(`options.${opt.id as 'sideDoor' | 'doubleCompartment' | 'powerGate' | 'pluginOption'}`)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tyre Specs — Front / Rear */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block">Tyre Specifications</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front Tyres */}
                  <div className="space-y-4 p-5 bg-white border border-gray-200 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Front Tyres</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Rim Size</label>
                        <input {...register('tyres.front.rimSize')} placeholder="e.g. 16 inch" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Tyre Size</label>
                        <input {...register('tyres.front.tyreSize')} placeholder="e.g. 205/75 R16" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Number of Studs</label>
                        <input type="number" step="1" {...register('tyres.front.numberOfStuds', { valueAsNumber: true })} placeholder="6" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Rear Tyres */}
                  <div className="space-y-4 p-5 bg-white border border-gray-200 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rear Tyres</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Rim Size</label>
                        <input {...register('tyres.rear.rimSize')} placeholder="e.g. 16 inch" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Tyre Size</label>
                        <input {...register('tyres.rear.tyreSize')} placeholder="e.g. 205/75 R16" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Number of Studs</label>
                        <input type="number" step="1" {...register('tyres.rear.numberOfStuds', { valueAsNumber: true })} placeholder="6" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Fuel Core</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {allFuelTypes.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setValue('fuelType', f.value as any)}
                    className={cn(
                      "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                      selectedFuel === f.value ? f.colorClass : FUEL_PILL_IDLE
                    )}
                  >
                    {f.shortLabel}
                  </button>
                ))}
                {!addingFuel ? (
                  <button type="button" onClick={() => setAddingFuel(true)}
                    className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 border-dashed border-gray-200 text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-all"
                  >+ New</button>
                ) : null}
              </div>
              {addingFuel && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newFuelName}
                    onChange={e => setNewFuelName(e.target.value)}
                    placeholder="Fuel type name…"
                    className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddFuel(); }
                      if (e.key === 'Escape') { setAddingFuel(false); setNewFuelName(''); }
                    }}
                  />
                  <button type="button" onClick={handleAddFuel}
                    disabled={!newFuelName.trim() || savingFuel}
                    className="px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-black disabled:opacity-40"
                  >{savingFuel ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                  <button type="button" onClick={() => { setAddingFuel(false); setNewFuelName(''); }}
                    className="px-3 py-2 bg-white border border-gray-200 text-gray-400 rounded-xl"
                  ><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Operational Status</span>
              </div>
              <div className="flex gap-2">
                {(['active', 'maintenance', 'unavailable'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('status', s)}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      selectedStatus === s ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-gray-50 border-gray-100 text-gray-400"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Financial Ownership</span>
              </div>
              <div className="flex gap-2">
                {(['owned', 'rented'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setValue('ownership', o)}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      selectedOwnership === o ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-400"
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* External Ownership Dossier */}
          {selectedOwnership === 'rented' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-10 p-10 bg-emerald-50 rounded-[2.5rem] border border-emerald-100"
            >
              <div className="flex items-center gap-4">
                <div className="h-px bg-emerald-200 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">External Ownership Dossier</h3>
                <div className="h-px bg-emerald-200 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* 1. Ownership Type — FIRST */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Ownership Type</label>
                  <select {...register('ownerDetails.ownershipType')} className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900 appearance-none cursor-pointer">
                    <option value="">Select Type...</option>
                    <option value="single-owner">Single Owner</option>
                    <option value="sole-proprietor">Sole Proprietor</option>
                    <option value="private-limited">Private Limited</option>
                  </select>
                </div>

                {/* 2. Owner Nickname */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Owner Nickname (Optional)</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                    <input {...register('ownerDetails.ownerNickname')} placeholder="e.g. Uncle Priya" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                  </div>
                </div>

                {/* 3. Owner Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Owner Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                    <input {...register('ownerDetails.ownerName')} placeholder="Full Name" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                  </div>
                </div>

                {/* 4. Business Name (conditional) */}
                {(selectedOwnershipType === 'sole-proprietor' || selectedOwnershipType === 'private-limited') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Business Name</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                      <input {...register('ownerDetails.businessName')} placeholder="Registered Business Name" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                  </div>
                )}

                {/* 5. Owner Address */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Owner Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                    <input {...register('ownerDetails.ownerAddress')} placeholder="Registered Address" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                  </div>
                </div>

                {/* 6. Owner NIC */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Owner NIC</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                    <input {...register('ownerDetails.ownerNicBr')} placeholder="National Identity Card No" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                  </div>
                </div>

                {/* BR Number (conditional) */}
                {(selectedOwnershipType === 'sole-proprietor' || selectedOwnershipType === 'private-limited') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Business Reg (BR) No</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-4 h-4" />
                      <input {...register('ownerDetails.brNumber')} placeholder="BR Number" className="w-full pl-10 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                  </div>
                )}

                {/* Payment Model */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Payment Model</label>
                  <select {...register('ownerDetails.paymentModel')} className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900 appearance-none">
                    <option value="Fixed Monthly">Fixed Monthly</option>
                    <option value="Per KM">Per KM</option>
                    <option value="Per Trip">Per Trip</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>

                {selectedPaymentModel === 'Fixed Monthly' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-emerald-100/50 p-6 rounded-2xl border border-emerald-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest px-1">Fixed Amount (Rs.)</label>
                      <input type="number" step="0.01" {...register('ownerDetails.monthlyConfig.fixedAmount', { valueAsNumber: true })} placeholder="160000" className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest px-1">KM Limit</label>
                      <input type="number" step="1" {...register('ownerDetails.monthlyConfig.kmLimit', { valueAsNumber: true })} placeholder="3500" className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest px-1">Extra KM Rate (Rs.)</label>
                      <input type="number" step="0.01" {...register('ownerDetails.monthlyConfig.extraKmRate', { valueAsNumber: true })} placeholder="50" className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                  </motion.div>
                )}

                {/* Agreement Dates */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Agreement Start</label>
                  <input {...register('ownerDetails.agreementStart')} type="date" className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Agreement End</label>
                  <input {...register('ownerDetails.agreementEnd')} type="date" className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Owner Payment Rate</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-[10px]">LKR</div>
                    <input {...register('ownerDetails.paymentRate', { valueAsNumber: true })} type="number" placeholder="0.00" className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                  </div>
                </div>

                {/* Bank Details — split */}
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70">Bank Details</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Bank Name</label>
                      <input {...register('ownerDetails.bankName')} placeholder="e.g. Commercial Bank" className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Branch</label>
                      <input {...register('ownerDetails.bankBranch')} placeholder="e.g. Colombo Fort" className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Account Number</label>
                      <input {...register('ownerDetails.accountNumber')} placeholder="1234567890" className="w-full px-4 py-4 bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900" />
                    </div>
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FileUpload
                    label="Lease/Agreement Contract (PDF)"
                    path="fleet/contracts"
                    accept="application/pdf"
                    onUploadComplete={(url) => setValue('ownerDetails.contractPdfUrl', url)}
                    currentUrl={watch('ownerDetails.contractPdfUrl')}
                  />
                  <FileUpload
                    label="Handover Condition Report"
                    path="fleet/reports"
                    onUploadComplete={(url) => setValue('ownerDetails.handoverConditionReport', url)}
                    currentUrl={watch('ownerDetails.handoverConditionReport')}
                  />
                  <FileUpload
                    label="Business Registration (BR) Document"
                    path="fleet/documents"
                    onUploadComplete={(url) => setValue('ownerDetails.brDocumentUrl', url)}
                    currentUrl={watch('ownerDetails.brDocumentUrl')}
                  />
                  <FileUpload
                    label="Owner ID Copy"
                    path="fleet/documents"
                    onUploadComplete={(url) => setValue('ownerDetails.idCopyUrl', url)}
                    currentUrl={watch('ownerDetails.idCopyUrl')}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="pt-10 border-t border-gray-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-200 disabled:text-gray-500 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Archive Modifications' : 'Initialize Asset'}</span>
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

export default VehicleFormPage;
