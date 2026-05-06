import { useState, useEffect } from 'react';
import { Customer, getCustomers } from '../services/customerService';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      if (data) {
        setCustomers(data);
      }
    } catch (err) {
      setError('Failed to fetch customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return { customers, loading, error, refresh: fetchCustomers };
};
