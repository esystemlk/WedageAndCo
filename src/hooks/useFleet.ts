import { useState, useEffect } from 'react';
import { Vehicle, getVehicles } from '../services/fleetService';

export const useFleet = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehicles();
      if (data) {
        setVehicles(data);
      }
    } catch (err) {
      setError('Failed to fetch fleet data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return { vehicles, loading, error, refresh: fetchVehicles };
};
