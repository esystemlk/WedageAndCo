import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute, RoleRoute } from './components/auth/RouteGuards';
import AppShell from './components/shared/AppShell';

// Lazy loading or direct imports
import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import DashboardPage from './pages/DashboardPage';
import StaffListPage from './pages/staff/StaffListPage';
import StaffFormPage from './pages/staff/StaffFormPage';
import StaffDetailPage from './pages/staff/StaffDetailPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import SupplierListPage from './pages/suppliers/SupplierListPage';
import SupplierFormPage from './pages/suppliers/SupplierFormPage';
import FleetListPage from './pages/fleet/FleetListPage';
import VehicleFormPage from './pages/fleet/VehicleFormPage';
import VehicleDetailPage from './pages/fleet/VehicleDetailPage';
import LogListPage from './pages/logs/LogListPage';
import LogFormPage from './pages/logs/LogFormPage';
import LogDetailPage from './pages/logs/LogDetailPage';
import GaragePage from './pages/garage/GaragePage';
import MaintenanceFormPage from './pages/garage/MaintenanceFormPage';
import MaintenanceDetailPage from './pages/garage/MaintenanceDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import InvoiceListPage from './pages/financial/InvoiceListPage';
import InvoiceFormPage from './pages/financial/InvoiceFormPage';
import { UserRole } from './config/roles';

import UserListPage from './pages/users/UserListPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pending" element={<PendingApprovalPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              
              {/* Module 2: Customers */}
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/new" element={<CustomerFormPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
              
              {/* Module 3: Suppliers */}
              <Route path="/suppliers" element={<SupplierListPage />} />
              <Route path="/suppliers/new" element={<SupplierFormPage />} />
              <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
              
              {/* Module 5: Fleet */}
              <Route path="/fleet" element={<FleetListPage />} />
              <Route path="/fleet/new" element={<VehicleFormPage />} />
              <Route path="/fleet/:id" element={<VehicleDetailPage />} />
              <Route path="/fleet/:id/edit" element={<VehicleFormPage />} />
              
              {/* Module 6: Log Sheets */}
              <Route path="/logs" element={<LogListPage />} />
              <Route path="/logs/new" element={<LogFormPage />} />
              <Route path="/logs/:id" element={<LogDetailPage />} />
              <Route path="/logs/:id/edit" element={<LogFormPage />} />
              
              {/* Module 7: Garage */}
              <Route path="/garage" element={<GaragePage />} />
              <Route path="/garage/new" element={<MaintenanceFormPage />} />
              <Route path="/garage/:id" element={<MaintenanceDetailPage />} />
              <Route path="/garage/:id/edit" element={<MaintenanceFormPage />} />

              {/* Module 8: Invoices */}
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              
              {/* Module 4: Staff */}
              <Route path="/staff" element={<StaffListPage />} />
              <Route path="/staff/new" element={<StaffFormPage />} />
              <Route path="/staff/:id" element={<StaffDetailPage />} />
              <Route path="/staff/:id/edit" element={<StaffFormPage />} />
              
              {/* Placeholders for other modules */}
              <Route path="/reports" element={<ReportsPage />} />
              
              <Route element={<RoleRoute minRole={UserRole.SUPER_ADMIN} />}>
                <Route path="/users" element={<UserListPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
                <p className="text-gray-500 mb-6">You don't have permission to view this section.</p>
                <button onClick={() => window.history.back()} className="text-indigo-600 font-bold hover:underline">Go Back</button>
              </div>
            </div>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
