import { useState, useEffect } from 'react';
import { LogSheet, getLogSheets } from '../services/logService';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getLogSheets();
      if (data) {
        setLogs(data);
      }
    } catch (err) {
      setError('Failed to fetch operation logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return { logs, loading, error, refresh: fetchLogs };
};
