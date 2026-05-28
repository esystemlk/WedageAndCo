import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileDown, CheckCircle2, Database, Fuel, Settings2,
  LogIn, Package, Zap, FileText, BarChart3, Globe,
  ShieldCheck, RefreshCw, Plus, Eye
} from 'lucide-react';
import { generateSessionReport } from '../utils/generateSessionReport';

// ─── Data ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 1,
    icon: Database,
    title: 'Mock Data → Real Firestore Database',
    subtitle: 'Every hardcoded array and fake number replaced with live Firestore connections',
    color: 'emerald',
    badge: '12 files',
    changes: [
      { action: 'MOD', file: 'DocumentsPage.tsx',           desc: 'Full Firebase Storage integration — real file upload, download, and delete' },
      { action: 'MOD', file: 'AttendancePage.tsx',          desc: 'Attendance records saved to and loaded from Firestore (keyed by date)' },
      { action: 'MOD', file: 'AdvancedFleetDashboard.tsx',  desc: 'Fleet charts use real fuel-transaction data from Firestore' },
      { action: 'MOD', file: 'FinancialDashboard.tsx',      desc: 'Cost analytics computed from real invoices, salaries, and fuel transactions' },
      { action: 'MOD', file: 'ReportsPage.tsx',             desc: 'Maintenance pie-chart categories derived from live maintenance records' },
      { action: 'FIX', file: 'gatePassService.ts',          desc: 'Random ID collision fixed — base-36 timestamp pattern' },
      { action: 'FIX', file: 'grnService.ts',               desc: 'Random ID collision fixed' },
      { action: 'FIX', file: 'poService.ts',                desc: 'Random ID collision fixed' },
      { action: 'FIX', file: 'jobCardService.ts',           desc: 'Random ID collision fixed' },
      { action: 'FIX', file: 'logService.ts',               desc: 'Random ID collision fixed' },
      { action: 'FIX', file: 'visitorLogService.ts',        desc: 'Random ID collision fixed' },
      { action: 'FIX', file: 'LogFormPage.tsx',             desc: 'Random ID collision fixed' },
    ],
  },
  {
    id: 2,
    icon: FileText,
    title: 'New Service Files Created',
    subtitle: 'Brand-new backend service modules wired to Firestore and Firebase Storage',
    color: 'indigo',
    badge: '4 new files',
    changes: [
      { action: 'NEW', file: 'src/config/fuelTypes.ts',           desc: 'Central fuel-type config: 9 types with labels, short labels, and Tailwind color classes' },
      { action: 'NEW', file: 'src/services/documentService.ts',   desc: 'Firebase Storage + Firestore CRUD for company documents; auto-detects MIME type & file size' },
      { action: 'NEW', file: 'src/services/attendanceService.ts', desc: 'Firestore attendance service — one document per calendar date with upsert pattern (setDoc)' },
      { action: 'NEW', file: 'src/services/configService.ts',     desc: 'Dynamic custom inventory categories and fuel types stored in Firestore (shared across all users)' },
    ],
  },
  {
    id: 3,
    icon: Fuel,
    title: 'Fuel Types Expansion',
    subtitle: 'Expanded from 2 types to 9 — all colour-coded pill buttons',
    color: 'amber',
    badge: '8 files',
    changes: [
      { action: 'NEW', file: 'fuelTypes.ts',                desc: 'FUEL_TYPE_VALUES: diesel, super-diesel, petrol, petrol-95, cng, lpg, electric, kerosene, other' },
      { action: 'MOD', file: 'fleetService.ts',             desc: 'Vehicle.fuelType widened from 2 literals to full FuelType union (9 types)' },
      { action: 'MOD', file: 'fuelStockService.ts',         desc: 'FuelTransaction.fuelType widened to full FuelType union' },
      { action: 'MOD', file: 'inventoryService.ts',         desc: 'Fuel sub-category list updated to match 9 fuel labels; InventoryItemExtended.fuelType widened' },
      { action: 'UPD', file: 'VehicleFormPage.tsx',         desc: '2-button toggle replaced with 3-column colour-coded pill grid for all 9 fuel types' },
      { action: 'UPD', file: 'FuelIssueFormPage.tsx',       desc: '3-column pill grid; auto-selects matching type when a stock item is chosen' },
      { action: 'UPD', file: 'InventoryItemFormPage.tsx',   desc: 'Fuel type <select> now lists all 9 types with full human-readable labels' },
      { action: 'UPD', file: 'QuickAddModal.tsx',           desc: 'Fuel type dropdown updated to all 9 options' },
    ],
  },
  {
    id: 4,
    icon: Settings2,
    title: 'Dynamic Custom Categories & Fuel Types',
    subtitle: 'Users can add their own categories and fuel types from forms — saved to Firestore',
    color: 'violet',
    badge: '7 files',
    changes: [
      { action: 'NEW', file: 'configService.ts',            desc: 'Firestore collections: custom_inventory_categories & custom_fuel_types with full CRUD' },
      { action: 'MOD', file: 'inventoryService.ts',         desc: 'InventoryCategory uses (string & {}) TypeScript pattern for autocomplete + open-ended custom strings; generateSKU handles unknown slugs' },
      { action: 'UPD', file: 'InventoryItemFormPage.tsx',   desc: 'Inline "+ New Type" dashed tile — type name + optional sub-categories → saves to Firestore, immediately selectable; custom tiles shown in violet' },
      { action: 'UPD', file: 'InventoryItemFormPage.tsx',   desc: 'Inline "+ Add Type" in Fuel Configuration section — creates custom fuel type on the spot' },
      { action: 'UPD', file: 'VehicleFormPage.tsx',         desc: 'Inline "+ New" dashed pill — saves custom fuel type to Firestore, auto-selects' },
      { action: 'UPD', file: 'FuelIssueFormPage.tsx',       desc: 'Same inline "+ New" fuel pill as VehicleFormPage' },
      { action: 'UPD', file: 'QuickAddModal.tsx',           desc: 'Fuel type dropdown merges built-in 9 + custom types from Firestore' },
    ],
  },
  {
    id: 5,
    icon: LogIn,
    title: 'Login Page Full Redesign',
    subtitle: 'Modern dark branding panel, 3-mode auth, password reveal, Firebase password reset',
    color: 'rose',
    badge: '1 file, 7 features',
    changes: [
      { action: 'MOD', file: 'LoginPage.tsx', desc: 'Dark (gray-950) left panel with animated indigo/violet glow blobs and subtle grid overlay' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: '3-mode authentication state machine: Sign In → Create Account → Reset Password' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: 'Show / Hide password toggle — Eye / EyeOff icon button inside password input' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: '"Forgot password?" link triggers Reset mode; calls Firebase sendPasswordResetEmail()' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: 'Email confirmation success card shown after reset link is dispatched' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: 'Icon-prefixed inputs (Mail, Lock icons); animated slide transitions between modes' },
      { action: 'MOD', file: 'LoginPage.tsx', desc: '12 Firebase error codes translated to human-readable messages' },
    ],
  },
];

const ACTION_STYLE: Record<string, string> = {
  NEW: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  MOD: 'bg-blue-100 text-blue-700 border border-blue-200',
  UPD: 'bg-violet-100 text-violet-700 border border-violet-200',
  FIX: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const SECTION_STYLES: Record<string, { header: string; badge: string; border: string; icon: string }> = {
  emerald: { header: 'from-emerald-600 to-teal-600',    badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-600' },
  indigo:  { header: 'from-indigo-600 to-blue-600',     badge: 'bg-indigo-100 text-indigo-700',   border: 'border-indigo-200',  icon: 'text-indigo-600' },
  amber:   { header: 'from-amber-500 to-orange-500',    badge: 'bg-amber-100 text-amber-700',     border: 'border-amber-200',   icon: 'text-amber-600' },
  violet:  { header: 'from-violet-600 to-purple-600',   badge: 'bg-violet-100 text-violet-700',   border: 'border-violet-200',  icon: 'text-violet-600' },
  rose:    { header: 'from-rose-600 to-pink-600',       badge: 'bg-rose-100 text-rose-700',       border: 'border-rose-200',    icon: 'text-rose-600' },
};

// ─── Component ────────────────────────────────────────────────────────────────
const SessionReportPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      generateSessionReport();
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  const totalFiles  = SECTIONS.reduce((a, s) => a + s.changes.length, 0);
  const newFiles    = SECTIONS.reduce((a, s) => a + s.changes.filter(c => c.action === 'NEW').length, 0);
  const fixedFiles  = SECTIONS.reduce((a, s) => a + s.changes.filter(c => c.action === 'FIX').length, 0);

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-10">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-950 rounded-[2.5rem] p-10 relative overflow-hidden"
      >
        {/* blobs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-violet-600/15 rounded-full blur-[60px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">Development Session</p>
            <h1 className="text-white font-black text-3xl xl:text-4xl">Session Report</h1>
            <p className="text-white/50 text-sm font-bold">Wedage & Co. Fleet Management System</p>

            {/* Stats chips */}
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { val: SECTIONS.length, label: 'Feature Areas' },
                { val: newFiles,        label: 'New Files' },
                { val: totalFiles,      label: 'Total Changes' },
                { val: fixedFiles,      label: 'Bug Fixes' },
                { val: 0,               label: 'Build Errors' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                  <span className="text-white font-black text-sm">{s.val}</span>
                  <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/30 shrink-0"
          >
            {downloading
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <FileDown  className="w-5 h-5" />
            }
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </motion.div>

      {/* ── Build badge ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex items-center gap-3 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl w-fit"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
          Build verified — npm run build → 0 errors
        </span>
      </motion.div>

      {/* ── Sections ─────────────────────────────────────────────────────────── */}
      {SECTIONS.map((section, si) => {
        const st = SECTION_STYLES[section.color];
        const Icon = section.icon;
        return (
          <motion.div key={section.id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + si * 0.07 }}
            className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Section header */}
            <div className={`bg-gradient-to-r ${st.header} p-6 flex items-start justify-between gap-4`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">Section {section.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 text-white`}>
                      {section.badge}
                    </span>
                  </div>
                  <h2 className="text-white font-black text-lg leading-tight">{section.title}</h2>
                  <p className="text-white/70 text-xs mt-0.5">{section.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Change rows */}
            <div className="divide-y divide-gray-50">
              {section.changes.map((ch, ci) => (
                <div key={ci} className={`flex gap-4 items-start px-6 py-3.5 ${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <span className={`mt-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${ACTION_STYLE[ch.action]}`}>
                    {ch.action}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">{ch.file}</p>
                    <p className="text-gray-600 text-xs font-medium leading-snug">{ch.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* ── Footer / branding ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-gray-950 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base">Esystemlk</p>
            <p className="text-white/40 text-[10px] font-bold">618 Jana Jaya City Mall, Rajagiriya, Sri Lanka</p>
          </div>
        </div>
        <div className="text-center sm:text-right space-y-1">
          <p className="text-white font-black text-sm">0765 711 396</p>
          <a href="https://www.esystemlk.com" target="_blank" rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-colors"
          >www.esystemlk.com</a>
        </div>
      </motion.div>

    </div>
  );
};

export default SessionReportPage;
