import { useState, useEffect } from 'react';
import { Maintenance, getMaintenanceRecords } from '../services/maintenanceService';

export const useMaintenance = (vehicleId?: string) => {
  const [records, setRecords] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await getMaintenanceRecords(vehicleId);
      if (data) {
        setRecords(data);
      }
    } catch (err) {
      setError('Failed to fetch maintenance records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [vehicleId]);

  return { records, loading, error, refresh: fetchRecords };
};
