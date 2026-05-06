import { useState, useEffect } from 'react';
import { StaffMember, getStaffMembers } from '../services/staffService';

export const useStaff = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getStaffMembers();
      setStaff(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return { staff, loading, error, refresh: fetchStaff };
};
