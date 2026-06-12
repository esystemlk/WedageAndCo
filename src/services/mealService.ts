/**
 * mealService.ts
 * Employee Meal Management + Payroll integration.
 *
 * Firestore collections
 *  - meal_settings        single config doc ("config"): per-meal costs, active flags, deduction method
 *  - employee_meals       one doc per employee per day  (id = `${employeeId}_${date}`)
 *  - meal_monthly_summary one doc per employee per month (id = `${employeeId}_${year}_${month}`)
 *
 * All mutations are written through the shared audit log (recordChange).
 */

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

// ── Types ────────────────────────────────────────────────────────────────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'tea';

/** Main meals can each be taken at a different location (e.g. a driver on a trip). */
export type MainMealType = 'breakfast' | 'lunch' | 'dinner';
export const MAIN_MEALS: MainMealType[] = ['breakfast', 'lunch', 'dinner'];

/** Per-main-meal location override: which place each main meal was taken at. */
export type MealLocationMap = Partial<Record<MainMealType, string>>;

export type MealDeductionMethod = 'immediate' | 'monthly' | 'none';

export interface MealTypeConfig {
  label: string;
  cost: number;
  isActive: boolean;
}

export interface MealSettings {
  breakfast: MealTypeConfig;
  lunch: MealTypeConfig;
  dinner: MealTypeConfig;
  tea: MealTypeConfig;
  deductionMethod: MealDeductionMethod;
  updatedAt?: any;
}

/** A per-meal-type price table (LKR). */
export type MealPrices = Record<MealType, number>;

export type MealLocationType = 'office' | 'rest-point' | 'partner' | 'other';

/**
 * A place where staff receive meals. The main office is the default location;
 * rest points / partner kitchens used by drivers on trips have their own prices
 * and (optionally) their own supplier.
 */
export interface MealLocation {
  id?: string;
  name: string;
  type: MealLocationType;
  address?: string;
  prices: MealPrices;          // per-location cost overrides
  supplierId?: string;         // meal supplier providing food here
  supplierName?: string;
  isDefault?: boolean;         // the main office / fallback location
  isActive: boolean;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

/** A vendor we buy meals from. */
export interface MealSupplier {
  id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

/** Why an outside guest was given a meal — for expense reporting. */
export type GuestMealReason = 'client-visit' | 'interview' | 'external-driver' | 'official' | 'other';
export const GUEST_MEAL_REASONS: { key: GuestMealReason; label: string }[] = [
  { key: 'client-visit',   label: 'Client / Customer Visit' },
  { key: 'interview',      label: 'Interview / Candidate' },
  { key: 'external-driver',label: 'External Driver' },
  { key: 'official',       label: 'Official / Auditor' },
  { key: 'other',          label: 'Other' },
];

/**
 * A meal given to someone who is NOT a staff member (a visitor from outside).
 * Pure company expense — never deducted from anyone's payroll.
 */
export interface GuestMeal {
  id?: string;
  date: string;            // YYYY-MM-DD
  guestName: string;
  company?: string;
  reason: GuestMealReason;
  authorizedBy?: string;   // who approved giving the meal
  locationId?: string;     // priced at this location
  locationName?: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  tea: boolean;
  count: number;           // number of guests served (price multiplier)
  total: number;           // computed cost
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface EmployeeMeal {
  id?: string;            // `${employeeId}_${date}`
  employeeId: string;
  employeeName?: string;
  department?: string;
  date: string;           // YYYY-MM-DD
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  tea: boolean;
  locationId?: string;    // day-default location (used for tea + any meal without its own override)
  locationName?: string;
  mealLocations?: MealLocationMap;            // per-main-meal location overrides
  mealLocationNames?: Partial<Record<MainMealType, string>>; // denormalised names for display/reports
  dailyTotal: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface MonthlySummaryRow {
  employeeId: string;
  employeeName: string;
  department: string;
  mealDays: number;       // number of days the employee took at least one meal
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  teaCount: number;
  totalMeals: number;     // total individual meals
  totalCost: number;
}

const SETTINGS_COLLECTION = 'meal_settings';
const SETTINGS_DOC = 'config';
const MEALS_COLLECTION = 'employee_meals';
const SUMMARY_COLLECTION = 'meal_monthly_summary';
const LOCATIONS_COLLECTION = 'meal_locations';
const SUPPLIERS_COLLECTION = 'meal_suppliers';
const GUEST_MEALS_COLLECTION = 'guest_meals';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'tea'];

export const DEFAULT_MEAL_SETTINGS: MealSettings = {
  breakfast: { label: 'Breakfast', cost: 150, isActive: true },
  lunch:     { label: 'Lunch',     cost: 350, isActive: true },
  dinner:    { label: 'Dinner',    cost: 300, isActive: true },
  tea:       { label: 'Tea / Snacks', cost: 100, isActive: true },
  deductionMethod: 'monthly',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export const mealDocId = (employeeId: string, date: string) => `${employeeId}_${date}`;
export const summaryDocId = (employeeId: string, year: number, month: number) =>
  `${employeeId}_${year}_${String(month).padStart(2, '0')}`;

export const defaultPricesFromSettings = (s: MealSettings): MealPrices => ({
  breakfast: s.breakfast.cost, lunch: s.lunch.cost, dinner: s.dinner.cost, tea: s.tea.cost,
});

/**
 * Resolve the effective price table: a location's per-meal prices override the
 * global default, but the global active flags still decide which meals count.
 */
export function resolvePrices(settings: MealSettings, location?: MealLocation | null): MealPrices {
  const base = defaultPricesFromSettings(settings);
  if (!location) return base;
  return {
    breakfast: location.prices?.breakfast ?? base.breakfast,
    lunch:     location.prices?.lunch ?? base.lunch,
    dinner:    location.prices?.dinner ?? base.dinner,
    tea:       location.prices?.tea ?? base.tea,
  };
}

/**
 * Compute the cost of a day's selected meals.
 *
 * `dayLocation` is the fallback place (also used for tea). Each main meal may
 * override it via `perMealLocations` — e.g. breakfast at the office, lunch at a
 * rest-point on a delivery run — and is then priced at that location.
 */
export function computeDailyTotal(
  meals: Pick<EmployeeMeal, 'breakfast' | 'lunch' | 'dinner' | 'tea'>,
  settings: MealSettings,
  dayLocation?: MealLocation | null,
  perMealLocations?: Partial<Record<MainMealType, MealLocation | null>>,
): number {
  const dayPrices = resolvePrices(settings, dayLocation);
  let total = 0;
  for (const t of MEAL_TYPES) {
    if (!meals[t] || !settings[t].isActive) continue;
    const override = t !== 'tea' ? perMealLocations?.[t as MainMealType] : null;
    total += override ? resolvePrices(settings, override)[t] : dayPrices[t];
  }
  return total;
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

// ── Settings ─────────────────────────────────────────────────────────────────
export const getMealSettings = async (): Promise<MealSettings> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC));
    if (snap.exists()) {
      return { ...DEFAULT_MEAL_SETTINGS, ...(snap.data() as MealSettings) };
    }
    return DEFAULT_MEAL_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SETTINGS_COLLECTION);
    return DEFAULT_MEAL_SETTINGS;
  }
};

export const saveMealSettings = async (settings: MealSettings): Promise<void> => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), {
      ...settings,
      updatedAt: Timestamp.now(),
    });
    await recordChange(
      OperationType.UPDATE, SETTINGS_COLLECTION, SETTINGS_DOC,
      `Updated meal settings (deduction: ${settings.deductionMethod})`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, SETTINGS_COLLECTION);
  }
};

// ── Daily meal entries ───────────────────────────────────────────────────────
export const getMealsByDate = async (date: string): Promise<EmployeeMeal[]> => {
  try {
    const q = query(collection(db, MEALS_COLLECTION), where('date', '==', date));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeMeal));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MEALS_COLLECTION);
    return [];
  }
};

export const getMealsInRange = async (start: string, end: string): Promise<EmployeeMeal[]> => {
  try {
    const q = query(
      collection(db, MEALS_COLLECTION),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeMeal));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MEALS_COLLECTION);
    return [];
  }
};

export const getEmployeeMeals = async (
  employeeId: string, start: string, end: string,
): Promise<EmployeeMeal[]> => {
  try {
    const q = query(
      collection(db, MEALS_COLLECTION),
      where('employeeId', '==', employeeId),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeMeal));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MEALS_COLLECTION);
    return [];
  }
};

/**
 * Resolve an entry's day-location + per-main-meal location overrides into the
 * objects computeDailyTotal needs, and the denormalised names for storage.
 */
const resolveEntryLocations = (
  entry: Pick<EmployeeMeal, 'locationId' | 'mealLocations'>,
  locMap: Map<string | undefined, MealLocation>,
) => {
  const dayLocation = entry.locationId ? locMap.get(entry.locationId) ?? null : null;
  const perMeal: Partial<Record<MainMealType, MealLocation | null>> = {};
  const perMealNames: Partial<Record<MainMealType, string>> = {};
  for (const t of MAIN_MEALS) {
    const lid = entry.mealLocations?.[t];
    if (!lid) continue;
    const loc = locMap.get(lid) ?? null;
    perMeal[t] = loc;
    if (loc?.name) perMealNames[t] = loc.name;
  }
  return { dayLocation, perMeal, perMealNames };
};

/** Create or update a single employee meal entry (idempotent by employee+date). */
export const upsertEmployeeMeal = async (
  entry: Omit<EmployeeMeal, 'id' | 'dailyTotal' | 'createdAt' | 'updatedAt'>,
  settings: MealSettings,
  locations: MealLocation[] = [],
): Promise<EmployeeMeal> => {
  const id = mealDocId(entry.employeeId, entry.date);
  const locMap = new Map(locations.map(l => [l.id, l]));
  const { dayLocation, perMeal, perMealNames } = resolveEntryLocations(entry, locMap);
  const dailyTotal = computeDailyTotal(entry, settings, dayLocation, perMeal);
  const payload: EmployeeMeal = {
    ...entry, id, dailyTotal,
    locationId: dayLocation?.id ?? entry.locationId,
    locationName: dayLocation?.name ?? entry.locationName,
    mealLocations: entry.mealLocations || {},
    mealLocationNames: perMealNames,
    updatedAt: Timestamp.now(),
  };
  try {
    await setDoc(doc(db, MEALS_COLLECTION, id), { ...payload, createdAt: Timestamp.now() }, { merge: true });
    await recordChange(
      OperationType.UPDATE, MEALS_COLLECTION, id,
      `Meal entry ${entry.employeeName || entry.employeeId} on ${entry.date} @ ${payload.locationName || 'default'} = LKR ${dailyTotal}`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, MEALS_COLLECTION);
  }
  return payload;
};

/**
 * Save many meal entries for one date in a single pass (bulk register).
 * Each entry may carry a day `locationId` plus per-main-meal location overrides.
 */
export const bulkUpsertMeals = async (
  date: string,
  entries: Omit<EmployeeMeal, 'id' | 'dailyTotal' | 'createdAt' | 'updatedAt'>[],
  settings: MealSettings,
  locations: MealLocation[] = [],
): Promise<void> => {
  try {
    await Promise.all(entries.map(e => upsertEmployeeMeal(e, settings, locations)));
    await recordChange(
      OperationType.UPDATE, MEALS_COLLECTION, date,
      `Bulk meal register saved for ${date} (${entries.length} employees)`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, MEALS_COLLECTION);
  }
};

export const deleteEmployeeMeal = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, MEALS_COLLECTION, id));
    await recordChange(OperationType.DELETE, MEALS_COLLECTION, id, 'Deleted meal entry');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, MEALS_COLLECTION);
  }
};

// ── Monthly aggregation ──────────────────────────────────────────────────────
/**
 * Aggregate raw daily entries for a month into per-employee summary rows.
 * Pass a name/department resolver so rows are display-ready.
 */
export const getMonthlySummary = async (
  year: number, month: number,
  resolve?: (employeeId: string) => { name: string; department: string } | undefined,
): Promise<MonthlySummaryRow[]> => {
  const { start, end } = monthDateRange(year, month);
  const meals = await getMealsInRange(start, end);

  const map = new Map<string, MonthlySummaryRow>();
  for (const m of meals) {
    if (!map.has(m.employeeId)) {
      const info = resolve?.(m.employeeId);
      map.set(m.employeeId, {
        employeeId: m.employeeId,
        employeeName: info?.name || m.employeeName || m.employeeId,
        department: info?.department || m.department || '—',
        mealDays: 0, breakfastCount: 0, lunchCount: 0, dinnerCount: 0, teaCount: 0,
        totalMeals: 0, totalCost: 0,
      });
    }
    const row = map.get(m.employeeId)!;
    const dayMeals = (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0) + (m.tea ? 1 : 0);
    if (dayMeals > 0) row.mealDays += 1;
    row.breakfastCount += m.breakfast ? 1 : 0;
    row.lunchCount     += m.lunch ? 1 : 0;
    row.dinnerCount    += m.dinner ? 1 : 0;
    row.teaCount       += m.tea ? 1 : 0;
    row.totalMeals     += dayMeals;
    row.totalCost      += m.dailyTotal || 0;
  }
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
};

/** Meal cost for a single employee in a given month (used by payroll). */
export const getEmployeeMonthlyCost = async (
  employeeId: string, year: number, month: number,
): Promise<{ totalCost: number; mealDays: number }> => {
  const { start, end } = monthDateRange(year, month);
  const meals = await getEmployeeMeals(employeeId, start, end);
  let totalCost = 0, mealDays = 0;
  for (const m of meals) {
    totalCost += m.dailyTotal || 0;
    if (m.breakfast || m.lunch || m.dinner || m.tea) mealDays += 1;
  }
  return { totalCost, mealDays };
};

/**
 * Payroll automation: snapshot the month's meal totals into
 * meal_monthly_summary so payroll has an immutable deduction record.
 */
export const generateMonthlyDeductions = async (
  year: number, month: number,
  resolve?: (employeeId: string) => { name: string; department: string } | undefined,
): Promise<MonthlySummaryRow[]> => {
  const rows = await getMonthlySummary(year, month, resolve);
  try {
    await Promise.all(rows.map(r =>
      setDoc(doc(db, SUMMARY_COLLECTION, summaryDocId(r.employeeId, year, month)), {
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        month, year,
        mealDays: r.mealDays,
        totalMeals: r.totalMeals,
        totalCost: r.totalCost,
        generatedAt: Timestamp.now(),
      }),
    ));
    await recordChange(
      OperationType.CREATE, SUMMARY_COLLECTION, `${year}-${month}`,
      `Generated monthly meal deductions for ${year}-${String(month).padStart(2, '0')} (${rows.length} employees)`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SUMMARY_COLLECTION);
  }
  return rows;
};

export interface LocationSummaryRow {
  locationId: string;
  locationName: string;
  type: string;
  supplierName: string;
  mealDays: number;
  totalMeals: number;
  totalCost: number;
}

/**
 * Aggregate a month's meal spend grouped by the location each meal was served
 * at. With per-main-meal locations a single day can span several places, so —
 * when `settings` is supplied — every meal is attributed to its own location
 * and priced there. Tea and any meal without an override fall to the day location.
 */
export const getLocationSummary = async (
  year: number, month: number, locations: MealLocation[] = [], settings?: MealSettings,
): Promise<LocationSummaryRow[]> => {
  const { start, end } = monthDateRange(year, month);
  const meals = await getMealsInRange(start, end);
  const locMap = new Map(locations.map(l => [l.id, l]));
  const map = new Map<string, LocationSummaryRow>();
  const dayKeys = new Map<string, Set<string>>(); // locationKey -> set of `${employee}_${date}`

  const rowFor = (locId?: string) => {
    const key = locId || 'default';
    if (!map.has(key)) {
      const loc = locId ? locMap.get(locId) : undefined;
      map.set(key, {
        locationId: key,
        locationName: loc?.name || (key === 'default' ? 'Default / Office' : key),
        type: loc?.type || 'office',
        supplierName: loc?.supplierName || '—',
        mealDays: 0, totalMeals: 0, totalCost: 0,
      });
      dayKeys.set(key, new Set());
    }
    return key;
  };

  for (const m of meals) {
    const dayLoc = m.locationId ? locMap.get(m.locationId) ?? null : null;
    const dayPrices = settings ? resolvePrices(settings, dayLoc) : null;
    for (const t of MEAL_TYPES) {
      if (!m[t]) continue;
      if (settings && !settings[t].isActive) continue;
      const overrideId = t !== 'tea' ? m.mealLocations?.[t as MainMealType] : undefined;
      const locId = overrideId || m.locationId;
      const key = rowFor(locId);
      const row = map.get(key)!;
      row.totalMeals += 1;
      dayKeys.get(key)!.add(`${m.employeeId}_${m.date}`);
      if (settings) {
        const loc = overrideId ? locMap.get(overrideId) ?? null : dayLoc;
        row.totalCost += overrideId ? resolvePrices(settings, loc)[t] : dayPrices![t];
      }
    }
    // When we have no settings to split costs, fall back to attributing the day total.
    if (!settings) {
      const key = rowFor(m.locationId);
      map.get(key)!.totalCost += m.dailyTotal || 0;
    }
  }
  for (const [key, row] of map) row.mealDays = dayKeys.get(key)?.size ?? 0;
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
};

// ── Meal Locations CRUD ──────────────────────────────────────────────────────
export const getMealLocations = async (): Promise<MealLocation[]> => {
  try {
    const snap = await getDocs(query(collection(db, LOCATIONS_COLLECTION), orderBy('name', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MealLocation));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, LOCATIONS_COLLECTION);
    return [];
  }
};

export const saveMealLocation = async (location: MealLocation): Promise<string | undefined> => {
  try {
    const ref = location.id ? doc(db, LOCATIONS_COLLECTION, location.id) : doc(collection(db, LOCATIONS_COLLECTION));
    // Only one default location: clear others when this one is set default.
    if (location.isDefault) {
      const existing = await getMealLocations();
      await Promise.all(existing.filter(l => l.isDefault && l.id !== ref.id)
        .map(l => setDoc(doc(db, LOCATIONS_COLLECTION, l.id!), { isDefault: false }, { merge: true })));
    }
    const { id, ...data } = location;
    await setDoc(ref, { ...data, updatedAt: Timestamp.now(), ...(location.id ? {} : { createdAt: Timestamp.now() }) }, { merge: true });
    await recordChange(location.id ? OperationType.UPDATE : OperationType.CREATE, LOCATIONS_COLLECTION, ref.id, `Saved meal location: ${location.name}`);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, LOCATIONS_COLLECTION);
  }
};

export const deleteMealLocation = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, LOCATIONS_COLLECTION, id));
    await recordChange(OperationType.DELETE, LOCATIONS_COLLECTION, id, 'Deleted meal location');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, LOCATIONS_COLLECTION);
  }
};

// ── Meal Suppliers CRUD ──────────────────────────────────────────────────────
export const getMealSuppliers = async (): Promise<MealSupplier[]> => {
  try {
    const snap = await getDocs(query(collection(db, SUPPLIERS_COLLECTION), orderBy('name', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MealSupplier));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SUPPLIERS_COLLECTION);
    return [];
  }
};

export const saveMealSupplier = async (supplier: MealSupplier): Promise<string | undefined> => {
  try {
    const ref = supplier.id ? doc(db, SUPPLIERS_COLLECTION, supplier.id) : doc(collection(db, SUPPLIERS_COLLECTION));
    const { id, ...data } = supplier;
    await setDoc(ref, { ...data, updatedAt: Timestamp.now(), ...(supplier.id ? {} : { createdAt: Timestamp.now() }) }, { merge: true });
    await recordChange(supplier.id ? OperationType.UPDATE : OperationType.CREATE, SUPPLIERS_COLLECTION, ref.id, `Saved meal supplier: ${supplier.name}`);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, SUPPLIERS_COLLECTION);
  }
};

export const deleteMealSupplier = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, SUPPLIERS_COLLECTION, id));
    await recordChange(OperationType.DELETE, SUPPLIERS_COLLECTION, id, 'Deleted meal supplier');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, SUPPLIERS_COLLECTION);
  }
};

// ── Guest (outsider) meals ───────────────────────────────────────────────────
/** Cost of one guest-meal record: selected meals priced at its location × guests. */
export const computeGuestTotal = (
  meal: Pick<GuestMeal, 'breakfast' | 'lunch' | 'dinner' | 'tea' | 'count'>,
  settings: MealSettings,
  location?: MealLocation | null,
): number => computeDailyTotal(meal, settings, location) * Math.max(1, meal.count || 1);

export const getGuestMealsInRange = async (start: string, end: string): Promise<GuestMeal[]> => {
  try {
    const q = query(
      collection(db, GUEST_MEALS_COLLECTION),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GuestMeal));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, GUEST_MEALS_COLLECTION);
    return [];
  }
};

export const saveGuestMeal = async (
  meal: GuestMeal, settings: MealSettings, locations: MealLocation[] = [],
): Promise<string | undefined> => {
  try {
    const ref = meal.id ? doc(db, GUEST_MEALS_COLLECTION, meal.id) : doc(collection(db, GUEST_MEALS_COLLECTION));
    const loc = meal.locationId ? locations.find(l => l.id === meal.locationId) ?? null : null;
    const total = computeGuestTotal(meal, settings, loc);
    const { id, ...data } = meal;
    await setDoc(ref, {
      ...data,
      locationName: loc?.name ?? meal.locationName ?? '',
      total,
      updatedAt: Timestamp.now(),
      ...(meal.id ? {} : { createdAt: Timestamp.now() }),
    }, { merge: true });
    await recordChange(
      meal.id ? OperationType.UPDATE : OperationType.CREATE, GUEST_MEALS_COLLECTION, ref.id,
      `Guest meal for ${meal.guestName || 'guest'} on ${meal.date} = LKR ${total}`,
    );
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, GUEST_MEALS_COLLECTION);
  }
};

export const deleteGuestMeal = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, GUEST_MEALS_COLLECTION, id));
    await recordChange(OperationType.DELETE, GUEST_MEALS_COLLECTION, id, 'Deleted guest meal');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, GUEST_MEALS_COLLECTION);
  }
};

export interface GuestSummary {
  count: number;       // number of guest-meal records
  guests: number;      // total guests served (sum of count)
  totalMeals: number;  // individual meals served
  totalCost: number;
}

/** Aggregate a month's guest-meal spend (company expense, never payroll). */
export const getGuestSummary = async (year: number, month: number): Promise<GuestSummary> => {
  const { start, end } = monthDateRange(year, month);
  const meals = await getGuestMealsInRange(start, end);
  return meals.reduce<GuestSummary>((acc, m) => {
    const guests = Math.max(1, m.count || 1);
    const perGuestMeals = (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0) + (m.tea ? 1 : 0);
    acc.count += 1;
    acc.guests += guests;
    acc.totalMeals += perGuestMeals * guests;
    acc.totalCost += m.total || 0;
    return acc;
  }, { count: 0, guests: 0, totalMeals: 0, totalCost: 0 });
};
