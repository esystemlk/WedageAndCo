import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Building2, 
  ChevronRight, 
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteCustomer } from '../../services/customerService';
import { useCustomers } from '../../hooks/useCustomers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const CustomerListPage: React.FC = () => {
  const { customers, loading, refresh } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.brNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        await deleteCustomer(id);
        refresh();
      } catch (err) {
        console.error(err);
        alert('Failed to delete customer');
      }
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Client Directory" 
        subtitle={`Operational Partnerships • ${customers.length} Active Accounts`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <PermissionGate permission="edit_customers">
              <Link 
                to="/customers/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Client</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[60vh]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 font-bold">Company / Identity</th>
                  <th className="px-8 py-5 font-bold">BR Number</th>
                  <th className="px-8 py-5 font-bold">Contact Channel</th>
                  <th className="px-8 py-5 font-bold">Agreement Cycle</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredCustomers.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{customer.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{customer.nickname || 'No Nickname'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded border bg-gray-50 border-gray-200 text-gray-500">
                        {customer.brNo}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-gray-600">{customer.officialContact}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs text-indigo-600 font-mono font-bold">
                          {customer.agreementEnd}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <PermissionGate permission="edit_customers">
                          <Link to={`/customers/${customer.id}/edit`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(customer.id!, customer.name)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        <ChevronRight className="w-4 h-4 text-gray-200 ml-2" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="py-24 text-center">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No clients found in registry.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerListPage;
