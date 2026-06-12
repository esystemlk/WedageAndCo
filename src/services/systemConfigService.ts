/**
 * systemConfigService.ts
 * Organisation-wide settings stored in a single Firestore document
 * (`app_config/main`): company profile, financial defaults, and alert thresholds.
 *
 * These are global (admin-managed) settings, distinct from per-user profile data.
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

export interface CompanyProfile {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNo?: string;   // VAT registration number
  brNo?: string;    // Business registration number
}

export interface FinancialDefaults {
  currency: string;       // e.g. 'LKR'
  taxRate: number;        // default VAT/tax percentage, e.g. 18
  invoicePrefix: string;  // e.g. 'INV-'
  poPrefix: string;       // purchase order prefix, e.g. 'PO-'
  grnPrefix: string;      // goods received note prefix, e.g. 'GRN-'
}

export interface AlertThresholds {
  criticalDays: number;   // <= this many days to expiry → critical
  warningDays: number;    // <= this many days to expiry → warning
}

export interface SystemConfig {
  company: CompanyProfile;
  financial: FinancialDefaults;
  alerts: AlertThresholds;
  updatedAt?: any;
}

const CONFIG_COLLECTION = 'app_config';
const CONFIG_DOC = 'main';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  company: {
    name: 'Wedage & Company (PVT) LTD',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    vatNo: '',
    brNo: '',
  },
  financial: {
    currency: 'LKR',
    taxRate: 18,
    invoicePrefix: 'INV-',
    poPrefix: 'PO-',
    grnPrefix: 'GRN-',
  },
  alerts: {
    criticalDays: 7,
    warningDays: 30,
  },
};

export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
    if (snap.exists()) {
      const data = snap.data() as Partial<SystemConfig>;
      // Merge with defaults so newly-added fields are always present
      return {
        company:   { ...DEFAULT_SYSTEM_CONFIG.company,   ...data.company },
        financial: { ...DEFAULT_SYSTEM_CONFIG.financial, ...data.financial },
        alerts:    { ...DEFAULT_SYSTEM_CONFIG.alerts,     ...data.alerts },
      };
    }
    return DEFAULT_SYSTEM_CONFIG;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, CONFIG_COLLECTION);
    return DEFAULT_SYSTEM_CONFIG;
  }
};

export const saveSystemConfig = async (config: SystemConfig): Promise<void> => {
  try {
    await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC), {
      company: config.company,
      financial: config.financial,
      alerts: config.alerts,
      updatedAt: Timestamp.now(),
    });
    await recordChange(
      OperationType.UPDATE, CONFIG_COLLECTION, CONFIG_DOC,
      `Updated system configuration (${config.company.name})`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, CONFIG_COLLECTION);
  }
};
