/**
 * Shared fuel type definitions used across Fleet, Inventory, and Fuel Issue forms.
 * Add new fuel types here — they will propagate to every selector automatically.
 */

export const FUEL_TYPE_VALUES = [
  'diesel',
  'super-diesel',
  'petrol',
  'petrol-95',
  'cng',
  'lpg',
  'electric',
  'kerosene',
  'other',
] as const;

export type FuelType = typeof FUEL_TYPE_VALUES[number];

/** Human-readable labels for display */
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  'diesel':       'Auto Diesel',
  'super-diesel': 'Super Diesel',
  'petrol':       'Petrol (92 Oct)',
  'petrol-95':    'Petrol (95 Oct)',
  'cng':          'CNG',
  'lpg':          'LPG',
  'electric':     'Electric / EV',
  'kerosene':     'Kerosene',
  'other':        'Other',
};

/** Short labels used in compact pill buttons */
export const FUEL_TYPE_SHORT: Record<FuelType, string> = {
  'diesel':       'Diesel',
  'super-diesel': 'Super Diesel',
  'petrol':       'Petrol 92',
  'petrol-95':    'Petrol 95',
  'cng':          'CNG',
  'lpg':          'LPG',
  'electric':     'Electric',
  'kerosene':     'Kerosene',
  'other':        'Other',
};

/** Color accent class per fuel type for UI pills */
export const FUEL_TYPE_COLOR: Record<FuelType, string> = {
  'diesel':       'bg-amber-50 border-amber-300 text-amber-700',
  'super-diesel': 'bg-orange-50 border-orange-300 text-orange-700',
  'petrol':       'bg-green-50 border-green-300 text-green-700',
  'petrol-95':    'bg-emerald-50 border-emerald-300 text-emerald-700',
  'cng':          'bg-sky-50 border-sky-300 text-sky-700',
  'lpg':          'bg-blue-50 border-blue-300 text-blue-700',
  'electric':     'bg-indigo-50 border-indigo-300 text-indigo-700',
  'kerosene':     'bg-yellow-50 border-yellow-300 text-yellow-700',
  'other':        'bg-gray-50 border-gray-300 text-gray-600',
};

/** Neutral (unselected) pill class */
export const FUEL_PILL_IDLE = 'bg-gray-50 border-gray-200 text-gray-400';
