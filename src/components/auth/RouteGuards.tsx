import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, meetsMinRole, Permission } from '../../config/roles';

export const ProtectedRoute: React.FC = () => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role === UserRole.PENDING && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }

  if (role !== UserRole.PENDING && location.pathname === '/pending') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const RoleRoute: React.FC<{ minRole: UserRole }> = ({ minRole }) => {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (!role || !meetsMinRole(role, minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export const PermissionGate: React.FC<{ 
  permission: Permission; 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ permission, children, fallback = null }) => {
  const { can } = useAuth();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
