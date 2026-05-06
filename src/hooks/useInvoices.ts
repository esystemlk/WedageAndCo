import { useState, useEffect } from 'react';
import { Invoice, getInvoices } from '../services/invoiceService';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      if (data) {
        setInvoices(data);
      }
    } catch (err) {
      setError('Failed to fetch financial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return { invoices, loading, error, refresh: fetchInvoices };
};
