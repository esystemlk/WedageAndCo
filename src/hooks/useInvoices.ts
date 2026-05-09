import { useState, useEffect } from 'react';
import { Invoice, getInvoices, updateInvoiceStatus } from '../services/invoiceService';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      if (data) {
        // Auto-detect overdue
        const now = new Date();
        const updatedData = await Promise.all(data.map(async inv => {
          if (inv.status === 'sent' && new Date(inv.dueDate) < now) {
            await updateInvoiceStatus(inv.id!, 'overdue');
            return { ...inv, status: 'overdue' as const };
          }
          return inv;
        }));
        setInvoices(updatedData);
      }
    } catch (err) {
      setError('Failed to fetch financial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Invoice['status']) => {
    try {
      await updateInvoiceStatus(id, status);
      // Optimistic update
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return { invoices, loading, error, refresh: fetchInvoices, updateStatus };
};
