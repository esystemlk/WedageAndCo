/**
 * Manages custom (user-defined) inventory categories and fuel types stored in Firestore.
 * These extend the built-in hardcoded defaults without replacing them.
 */
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Custom Inventory Categories ────────────────────────────────────────────

export interface CustomCategory {
  id?: string;
  value: string;          // URL-safe slug, e.g. 'tyres'
  label: string;          // Display name, e.g. 'Tyres'
  skuPrefix: string;      // SKU prefix, e.g. 'TYR'
  subCategories: string[];
}

const CAT_COL = 'custom_inventory_categories';

export const getCustomCategories = async (): Promise<CustomCategory[]> => {
  try {
    const snap = await getDocs(query(collection(db, CAT_COL), orderBy('label', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CustomCategory);
  } catch {
    return [];
  }
};

export const addCustomCategory = async (
  data: Omit<CustomCategory, 'id'>
): Promise<CustomCategory> => {
  const ref = await addDoc(collection(db, CAT_COL), data);
  return { id: ref.id, ...data };
};

export const deleteCustomCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, CAT_COL, id));
};

// ─── Custom Fuel Types ───────────────────────────────────────────────────────

export interface CustomFuelType {
  id?: string;
  value: string;      // slug, e.g. 'bio-diesel'
  label: string;      // display, e.g. 'Bio Diesel'
  shortLabel: string; // compact label, e.g. 'Bio D'
}

const FUEL_COL = 'custom_fuel_types';

export const getCustomFuelTypes = async (): Promise<CustomFuelType[]> => {
  try {
    const snap = await getDocs(query(collection(db, FUEL_COL), orderBy('label', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CustomFuelType);
  } catch {
    return [];
  }
};

export const addCustomFuelType = async (
  data: Omit<CustomFuelType, 'id'>
): Promise<CustomFuelType> => {
  const ref = await addDoc(collection(db, FUEL_COL), data);
  return { id: ref.id, ...data };
};

export const deleteCustomFuelType = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, FUEL_COL, id));
};
