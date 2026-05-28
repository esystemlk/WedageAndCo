import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute, RoleRoute } from './components/auth/RouteGuards';
import AppShell from './components/shared/AppShell';

// Lazy loading or direct imports
import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import DashboardPage from './pages/DashboardPage';
import StaffListPage from './pages/staff/StaffListPage';
import StaffFormPage from './pages/staff/StaffFormPage';
import StaffDetailPage from './pages/staff/StaffDetailPage';
import AttendancePage from './pages/staff/AttendancePage';
import PayrollPage from './pages/staff/PayrollPage';
import LeaveRequestsPage from './pages/staff/LeaveRequestsPage';
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
import DailyVehicleUpdatePage from './pages/ops/DailyVehicleUpdatePage';
import DailyUpdateFormPage from './pages/ops/DailyUpdateFormPage';
import PurchaseOrderListPage from './pages/procurement/PurchaseOrderListPage';
import PurchaseOrderFormPage from './pages/procurement/PurchaseOrderFormPage';
import GRNListPage from './pages/procurement/GRNListPage';
import GRNFormPage from './pages/procurement/GRNFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import InvoiceListPage from './pages/financial/InvoiceListPage';
import InvoiceFormPage from './pages/financial/InvoiceFormPage';
import { UserRole } from './config/roles';

import UserListPage from './pages/users/UserListPage';
import SettingsPage from './pages/SettingsPage';
import GatePassListPage from './pages/security/GatePassListPage';
import GatePassFormPage from './pages/security/GatePassFormPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import AdvancedFleetDashboard from './pages/fleet/AdvancedFleetDashboard';
import FinancialDashboard from './pages/financial/FinancialDashboard';
import CalendarPage from './pages/calendar/CalendarPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import JobCardListPage from './pages/garage/JobCardListPage';
import JobCardFormPage from './pages/garage/JobCardFormPage';
import InventoryItemFormPage from './pages/inventory/InventoryItemFormPage';
import FuelIssueFormPage from './pages/inventory/FuelIssueFormPage';
import OilIssueFormPage from './pages/inventory/OilIssueFormPage';
import SessionReportPage from './pages/SessionReportPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
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
                
                {/* Module: Procurement & Supply Chain */}
              <Route path="/suppliers" element={<SupplierListPage />} />
              <Route path="/suppliers/new" element={<SupplierFormPage />} />
              <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="/grn" element={<GRNListPage />} />
              <Route path="/grn/new" element={<GRNFormPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/new" element={<InventoryItemFormPage />} />
              <Route path="/inventory/:id/edit" element={<InventoryItemFormPage />} />
              <Route path="/inventory/fuel/new" element={<FuelIssueFormPage />} />
              <Route path="/inventory/fuel/:id/edit" element={<FuelIssueFormPage />} />
              <Route path="/inventory/oil/new" element={<OilIssueFormPage />} />
              <Route path="/inventory/oil/:id/edit" element={<OilIssueFormPage />} />
                
                {/* Module 4: Staff */}
                <Route path="/staff" element={<StaffListPage />} />
                <Route path="/staff/attendance" element={<AttendancePage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/payroll/leaves" element={<LeaveRequestsPage />} />
                <Route path="/staff/new" element={<StaffFormPage />} />
                <Route path="/staff/:id" element={<StaffDetailPage />} />
                <Route path="/staff/:id/edit" element={<StaffFormPage />} />

                {/* Module: Assets & Logistics */}
              <Route path="/fleet" element={<FleetListPage />} />
              <Route path="/fleet/new" element={<VehicleFormPage />} />
              <Route path="/fleet/:id" element={<VehicleDetailPage />} />
              <Route path="/fleet/:id/edit" element={<VehicleFormPage />} />
              <Route path="/fleet/analytics" element={<AdvancedFleetDashboard />} />
                
                {/* Module: Operations Management */}
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/daily-updates" element={<DailyVehicleUpdatePage />} />
                <Route path="/daily-updates/new" element={<DailyUpdateFormPage />} />
                <Route path="/logs" element={<LogListPage />} />
                <Route path="/logs/new" element={<LogFormPage />} />
                <Route path="/logs/:id" element={<LogDetailPage />} />
                <Route path="/logs/:id/edit" element={<LogFormPage />} />

                {/* Module: Security (Gate Pass) */}
                <Route path="/security" element={<GatePassListPage />} />
                <Route path="/security/new" element={<GatePassFormPage />} />
                <Route path="/security/:id" element={<GatePassFormPage />} />
                <Route path="/security/:id/edit" element={<GatePassFormPage />} />
                
                {/* Module 7: Garage */}
                <Route path="/garage" element={<GaragePage />} />
                <Route path="/garage/new" element={<MaintenanceFormPage />} />
                <Route path="/garage/:id" element={<MaintenanceDetailPage />} />
                <Route path="/garage/:id/edit" element={<MaintenanceFormPage />} />
                <Route path="/garage/job-cards" element={<JobCardListPage />} />
                <Route path="/garage/job-cards/new" element={<JobCardFormPage />} />
                <Route path="/garage/job-cards/:id/edit" element={<JobCardFormPage />} />

                {/* Module 8: Invoices */}
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
              <Route path="/financial-dashboard" element={<FinancialDashboard />} />
                
                {/* Placeholders for other modules */}
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/session-report" element={<SessionReportPage />} />
                
                <Route element={<RoleRoute minRole={UserRole.SUPER_ADMIN} />}>
                  <Route path="/users" element={<UserListPage />} />
                  <Route path="/audit" element={<AuditLogPage />} />
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
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
