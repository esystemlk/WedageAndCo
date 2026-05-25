import { useState, useEffect } from 'react';
import { JobCard, getJobCards } from '../services/jobCardService';

export const useJobCards = () => {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const data = await getJobCards();
      setJobCards(data);
    } catch (err) {
      setError('Failed to fetch job cards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, []);

  return { jobCards, loading, error, refresh: fetchJobCards };
};
