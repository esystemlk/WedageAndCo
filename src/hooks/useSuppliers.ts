import { useState, useEffect } from 'react';
import { Supplier, getSuppliers } from '../services/supplierService';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers();
      if (data) {
        setSuppliers(data);
      }
    } catch (err) {
      setError('Failed to fetch suppliers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return { suppliers, loading, error, refresh: fetchSuppliers };
};
