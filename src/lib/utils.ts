import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Firestore rejects any `undefined` field value (it throws "Unsupported field
 * value: undefined"). Optional fields left blank on forms arrive as `undefined`,
 * so strip them out recursively before writing. Dates, Firestore Timestamps and
 * other class instances are preserved as-is; arrays are cleaned element-wise.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T;
  }
  // Only descend into plain objects — leave class instances (Date, Timestamp,
  // GeoPoint, DocumentReference, etc.) untouched.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Derive how many litres one stock unit holds, from an item's unitType string.
 * e.g. "500mL Bottle" -> 0.5, "1L Bottle" -> 1, "4L Container" -> 4,
 * "20L Container" -> 20, "200L Barrel" -> 200, "Litres" -> 1, "mL" -> 0.001.
 * Non-volume / unrecognised units fall back to 1 (treat the stock count as litres).
 */
export function litresPerUnit(unitType?: string): number {
  if (!unitType) return 1;
  const u = unitType.trim().toLowerCase();
  if (u === 'litres' || u === 'litre' || u === 'l') return 1;
  if (u === 'ml') return 0.001;
  const m = u.match(/([\d.]+)\s*(ml|l)\b/);
  if (m) {
    const val = parseFloat(m[1]);
    return m[2] === 'ml' ? val / 1000 : val;
  }
  return 1;
}
