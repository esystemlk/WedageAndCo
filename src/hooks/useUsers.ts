import { useState, useEffect } from 'react';
import { UserProfile, getAllUsers, updateUserRole, updateUserPermissions } from '../services/userService';
import { UserRole, Permission } from '../config/roles';

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to retrieve user registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      throw err;
    }
  };

  const changePermissions = async (userId: string, permissions: Permission[] | null) => {
    try {
      await updateUserPermissions(userId, permissions);
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        if (permissions === null) { const { permissions: _omit, ...rest } = u; return rest as UserProfile; }
        return { ...u, permissions };
      }));
    } catch (err) {
      console.error('Failed to update permissions:', err);
      throw err;
    }
  };

  return { users, loading, error, refresh: fetchUsers, changeRole, changePermissions };
};
