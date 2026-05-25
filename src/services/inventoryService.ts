import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

export type InventoryCategory =
  | 'fuel'
  | 'lubricants'
  | 'filters'
  | 'parts-new'
  | 'parts-used'
  | 'battery-new'
  | 'battery-used'
  | 'electrical'
  | 'stationery'
  | 'other';

export type StockStatus = 'available' | 'low-stock' | 'out-of-stock' | 'reserved' | 'damaged' | 'expired';

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  'fuel': 'Fuel',
  'lubricants': 'Lubricants',
  'filters': 'Filters',
  'parts-new': 'Brand New Parts',
  'parts-used': 'Second-hand Parts',
  'battery-new': 'Battery (New)',
  'battery-used': 'Battery (Used)',
  'electrical': 'Electrical',
  'stationery': 'Stationery',
  'other': 'Other',
};

export const SUB_CATEGORIES: Record<InventoryCategory, string[]> = {
  'fuel': ['Diesel', 'Petrol'],
  'lubricants': ['Engine Oil', 'Gear Oil', 'Differential Oil', 'Brake Fluid', 'ATF / Power Steering', 'Hydraulic Oil', 'Coolant'],
  'filters': ['Oil Filter', 'Air Filter', 'Fuel Filter', 'Cabin Air Filter', 'Hydraulic Filter'],
  'parts-new': ['Engine', 'Transmission', 'Suspension', 'Brakes', 'Cooling', 'Refrigeration Unit', 'Body', 'Electrical', 'Other'],
  'parts-used': ['Engine', 'Transmission', 'Suspension', 'Brakes', 'Cooling', 'Refrigeration Unit', 'Body', 'Electrical', 'Other'],
  'battery-new': ['12V', '24V'],
  'battery-used': ['12V', '24V'],
  'electrical': ['Relay', 'Fuse', 'Wire / Cable', 'Bulb / Lamp', 'Sensor', 'Switch', 'Connector', 'Terminal'],
  'stationery': ['Paper / Printing', 'Writing', 'Files / Folders', 'Packaging', 'Other'],
  'other': ['General'],
};

const SKU_PREFIXES: Record<InventoryCategory, string> = {
  'fuel': 'FUEL',
  'lubricants': 'LUB',
  'filters': 'FLT',
  'parts-new': 'PRT',
  'parts-used': 'USD',
  'battery-new': 'BATN',
  'battery-used': 'BATU',
  'electrical': 'ELE',
  'stationery': 'STN',
  'other': 'INV',
};

export function generateSKU(category: InventoryCategory): string {
  const prefix = SKU_PREFIXES[category];
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

export function computeStockStatus(currentStock: number, minStockLevel: number): StockStatus {
  if (currentStock <= 0) return 'out-of-stock';
  if (currentStock <= minStockLevel) return 'low-stock';
  return 'available';
}

export interface InventoryItemExtended {
  fuelType?: 'diesel' | 'petrol';
  tankCapacityL?: number;
  oilGrade?: string;
  compatibleVehicleTypes?: string;
  packSize?: string;
  filterType?: string;
  compatibleVehicleModel?: string;
  oemPartNumber?: string;
  alternativePartNumber?: string;
  serviceIntervalKm?: number;
  partNumber?: string;
  isOEM?: boolean;
  vehicleCompatibility?: string;
  warrantyPeriod?: string;
  warrantyExpiry?: string;
  serialNumber?: string;
  sourceVehicle?: string;
  conditionGrade?: 'A' | 'B' | 'C';
  testedStatus?: 'tested-ok' | 'untested' | 'faulty';
  estimatedRemainingLife?: string;
  isRefurbished?: boolean;
  refurbishmentCost?: number;
  removalDate?: string;
  batteryCapacityAh?: number;
  voltage?: number;
  manufactureDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  installedVehicle?: string;
  chargingStatus?: string;
  terminalType?: string;
  testVoltageReading?: number;
  electricalType?: string;
  voltageRating?: string;
  ampRating?: string;
  connectorType?: string;
  wireGauge?: string;
  itemSpecification?: string;
  departmentIssuedTo?: string;
  approvalRequired?: boolean;
  monthlyUsageRate?: number;
}

export interface InventoryItem {
  id?: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  subCategory: string;
  brand: string;
  unitType: string;
  openingStock: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQuantity: number;
  purchaseCost: number;
  averageCost: number;
  issueRate: number;
  supplierName: string;
  supplierContact: string;
  datePurchased: string;
  expiryDate?: string;
  batchNumber?: string;
  warehouseLocation: string;
  binRackNumber?: string;
  stockStatus: StockStatus;
  lastIssuedDate?: string;
  lastUpdatedBy: string;
  notes?: string;
  extended?: InventoryItemExtended;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION = 'inventory_items';

export const createInventoryItem = async (data: Omit<InventoryItem, 'id' | 'sku' | 'stockStatus' | 'createdAt' | 'updatedAt'>) => {
  try {
    const sku = generateSKU(data.category);
    const stockStatus = computeStockStatus(data.currentStock ?? 0, data.minStockLevel ?? 0);
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      sku,
      stockStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created inventory item: ${data.name} (${sku})`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const getInventoryItems = async (category?: InventoryCategory): Promise<InventoryItem[]> => {
  try {
    const q = category
      ? query(collection(db, COLLECTION), where('category', '==', category), orderBy('createdAt', 'desc'))
      : query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getInventoryItem = async (id: string): Promise<InventoryItem | null> => {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as InventoryItem;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>) => {
  try {
    const stockStatus = data.currentStock !== undefined && data.minStockLevel !== undefined
      ? computeStockStatus(data.currentStock, data.minStockLevel)
      : undefined;
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      ...(stockStatus && { stockStatus }),
      updatedAt: serverTimestamp()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted inventory item');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};

export const adjustInventoryStock = async (
  id: string,
  quantityChange: number,
  lastUpdatedBy: string,
  lastIssuedDate?: string
) => {
  try {
    const item = await getInventoryItem(id);
    if (!item) throw new Error('Item not found');
    const newStock = Math.max(0, (item.currentStock || 0) + quantityChange);
    const stockStatus = computeStockStatus(newStock, item.minStockLevel || 0);
    await updateDoc(doc(db, COLLECTION, id), {
      currentStock: newStock,
      stockStatus,
      lastUpdatedBy,
      ...(lastIssuedDate && { lastIssuedDate }),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};
