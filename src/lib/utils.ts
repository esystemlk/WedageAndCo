import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Return a `YYYY-MM-DD` string using LOCAL calendar date components.
 *
 * IMPORTANT: never use `new Date().toISOString().split('T')[0]` for "today" —
 * toISOString() converts to UTC, so in Sri Lanka (UTC+5:30) any time between
 * local midnight and ~05:30 resolves to the PREVIOUS day, producing wrong
 * default dates and date-filter mismatches. This helper reads the local Y/M/D.
 */
export function toDateStr(d: Date | string | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date as a local `YYYY-MM-DD` string (see toDateStr). */
export function todayStr(): string {
  return toDateStr(new Date());
}

/**
 * Safely coerce any stored date value to a JS Date, or null.
 * Handles Firestore Timestamp ({toDate}), {seconds}, Date, ISO string and epoch
 * number — so callers never crash calling `.toDate()` on a string/undefined.
 */
export function toJsDate(value: any): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    try { const d = value.toDate(); return isNaN(d.getTime()) ? null : d; } catch { return null; }
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
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
