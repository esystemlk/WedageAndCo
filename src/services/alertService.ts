/**
 * alertService.ts
 * Central service that scans fleet and inventory data and returns actionable alerts.
 * Used by NotificationContext (on app load) and the Dashboard AlertsWidget.
 */

import { getVehicles } from './fleetService';
import { getInventoryItems } from './inventoryService';
import { getSystemConfig, DEFAULT_SYSTEM_CONFIG } from './systemConfigService';

export type AlertSeverity = 'expired' | 'critical' | 'warning' | 'info';
export type AlertCategory = 'document' | 'maintenance' | 'stock' | 'booking';

export interface SystemAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  daysUntil?: number;         // negative = already expired
  vehicleId?: string;
  vehiclePlate?: string;
  actionUrl?: string;
  actionLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysDiff(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function severityFromDays(
  days: number,
  criticalDays: number = DEFAULT_SYSTEM_CONFIG.alerts.criticalDays,
  warningDays: number = DEFAULT_SYSTEM_CONFIG.alerts.warningDays,
): AlertSeverity {
  if (days < 0)            return 'expired';
  if (days <= criticalDays) return 'critical';
  if (days <= warningDays)  return 'warning';
  return 'info';
}

function docLabel(days: number): string {
  if (days < 0)  return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today!';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

// ─── Main function ─────────────────────────────────────────────────────────────
export const getSystemAlerts = async (): Promise<SystemAlert[]> => {
  const alerts: SystemAlert[] = [];

  // Admin-configurable expiry lead times
  const { criticalDays, warningDays } = (await getSystemConfig()).alerts;
  const sevForDays = (days: number) => severityFromDays(days, criticalDays, warningDays);
  // Scan window: at least 60 days, or further out if the warning lead time is longer
  const scanWindow = Math.max(60, warningDays);

  // ── 1. Fleet document expiry ─────────────────────────────────────────────
  try {
    const vehicles = await getVehicles() || [];
    for (const v of vehicles) {
      const checks = [
        { field: v.vehicleLicenseExpiry, label: 'Vehicle Licence',  doc: 'license'   },
        { field: v.insuranceExpiry,       label: 'Insurance',        doc: 'insurance' },
        { field: v.emissionTestExpiry,    label: 'Emission Test',    doc: 'emission'  },
      ];

      for (const c of checks) {
        if (!c.field) continue;
        const days = daysDiff(c.field);
        if (days > scanWindow) continue; // only alert within the scan window (or if expired)
        const sev = sevForDays(days);
        alerts.push({
          id:           `doc-${v.id}-${c.doc}`,
          category:     'document',
          severity:     sev,
          title:        `${v.plateNo} — ${c.label} ${sev === 'expired' ? 'Expired' : 'Expiring Soon'}`,
          message:      `${c.label} for ${v.plateNo}${v.nickname ? ` (${v.nickname})` : ''}. ${docLabel(days)}.`,
          daysUntil:    days,
          vehicleId:    v.id,
          vehiclePlate: v.plateNo,
          actionUrl:    `/fleet/${v.id}/edit`,
          actionLabel:  'Update Document',
        });
      }

      // ── Maintenance due by date ──────────────────────────────────────────
      if (v.nextServiceDate) {
        const days = daysDiff(v.nextServiceDate);
        if (days <= 14) {
          const sev = sevForDays(days);
          alerts.push({
            id:           `maint-date-${v.id}`,
            category:     'maintenance',
            severity:     sev,
            title:        `${v.plateNo} — Service ${sev === 'expired' ? 'Overdue' : 'Due Soon'}`,
            message:      `Scheduled service for ${v.plateNo}. ${docLabel(days)}.`,
            daysUntil:    days,
            vehicleId:    v.id,
            vehiclePlate: v.plateNo,
            actionUrl:    `/garage/new`,
            actionLabel:  'Schedule Service',
          });
        }
      }

      // ── Maintenance due by KM ────────────────────────────────────────────
      if (v.nextServiceKm && v.currentOdometerKm) {
        const kmLeft = v.nextServiceKm - v.currentOdometerKm;
        if (kmLeft <= 500 && kmLeft > -10000) {
          alerts.push({
            id:           `maint-km-${v.id}`,
            category:     'maintenance',
            severity:     kmLeft <= 0 ? 'critical' : 'warning',
            title:        `${v.plateNo} — KM Service ${kmLeft <= 0 ? 'Overdue' : 'Approaching'}`,
            message:      kmLeft <= 0
              ? `${v.plateNo} is ${Math.abs(kmLeft).toLocaleString()} km past service milestone (${v.nextServiceKm?.toLocaleString()} km).`
              : `${v.plateNo} has ${kmLeft.toLocaleString()} km remaining before next service at ${v.nextServiceKm?.toLocaleString()} km.`,
            vehicleId:    v.id,
            vehiclePlate: v.plateNo,
            actionUrl:    `/garage/new`,
            actionLabel:  'Schedule Service',
          });
        }
      }
    }
  } catch (e) {
    console.warn('alertService: fleet check failed', e);
  }

  // ── 2. Inventory low stock ───────────────────────────────────────────────
  try {
    const items = await getInventoryItems() || [];
    const lowItems = items.filter(i =>
      i.stockStatus === 'low-stock' || i.stockStatus === 'out-of-stock'
    );
    for (const item of lowItems) {
      const isOut = item.stockStatus === 'out-of-stock';
      alerts.push({
        id:          `stock-${item.id}`,
        category:    'stock',
        severity:    isOut ? 'critical' : 'warning',
        title:       `${isOut ? 'Out of Stock' : 'Low Stock'} — ${item.name}`,
        message:     isOut
          ? `${item.name} (${item.sku}) is out of stock. Reorder immediately.`
          : `${item.name} (${item.sku}) has only ${item.currentStock} ${item.unitType} remaining (min: ${item.minStockLevel}).`,
        actionUrl:   `/inventory`,
        actionLabel: 'View Inventory',
      });
    }
  } catch (e) {
    console.warn('alertService: stock check failed', e);
  }

  // Sort: expired first, then critical, warning, info — then by daysUntil asc
  const order: Record<AlertSeverity, number> = { expired: 0, critical: 1, warning: 2, info: 3 };
  alerts.sort((a, b) => {
    const so = order[a.severity] - order[b.severity];
    if (so !== 0) return so;
    return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
  });

  return alerts;
};

// ── Convenience: count by severity ──────────────────────────────────────────
export const countAlertsBySeverity = (alerts: SystemAlert[]) => ({
  expired:  alerts.filter(a => a.severity === 'expired').length,
  critical: alerts.filter(a => a.severity === 'critical').length,
  warning:  alerts.filter(a => a.severity === 'warning').length,
  total:    alerts.length,
});
