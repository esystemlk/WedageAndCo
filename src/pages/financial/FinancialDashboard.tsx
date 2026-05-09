import React, { useMemo, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PieChart as PieChartIcon,
  BarChart3,
  Plus,
  Filter,
  Calendar,
  FileText,
  Target
} from 'lucide-react';
import { useInvoices } from '../../hooks/useInvoices';
import { useMaintenance } from '../../hooks/useMaintenance';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { motion } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '../../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const EXPENSE_CATEGORIES = ['Fuel', 'Maintenance', 'Salaries', 'Insurance', 'Other'];

const FinancialDashboard: React.FC = () => {
  const { invoices, loading: invLoading } = useInvoices();
  const { records: maintenance, loading: maintLoading } = useMaintenance();
  const [view, setView] = useState<'overview' | 'expenses' | 'budget'>('overview');

  const loading = invLoading || maintLoading;

  const financialData = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalMaintenanceCost = maintenance.reduce((sum, rec) => sum + rec.cost, 0);

    const expenses = [
      { category: 'Fuel', amount: 1250000, color: '#6366f1' },
      { category: 'Maintenance', amount: totalMaintenanceCost, color: '#f59e0b' },
      { category: 'Salaries', amount: 2500000, color: '#10b981' },
      { category: 'Insurance', amount: 350000, color: '#8b5cf6' },
      { category: 'Other', amount: 180000, color: '#06b6d4' },
    ];

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const monthlyData = [
      { month: 'Jan', revenue: 1800000, expenses: 1450000 },
      { month: 'Feb', revenue: 2200000, expenses: 1580000 },
      { month: 'Mar', revenue: 1950000, expenses: 1490000 },
      { month: 'Apr', revenue: 2400000, expenses: 1720000 },
      { month: 'May', revenue: 2800000, expenses: 1890000 },
      { month: 'Jun', revenue: 2550000, expenses: 1780000 },
    ];

    const budgetData = [
      { category: 'Fuel', budget: 1300000, spent: 1250000 },
      { category: 'Maintenance', budget: 500000, spent: totalMaintenanceCost },
      { category: 'Salaries', budget: 2600000, spent: 2500000 },
      { category: 'Insurance', budget: 400000, spent: 350000 },
      { category: 'Other', budget: 200000, spent: 180000 },
    ];

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      expenses,
      monthlyData,
      budgetData
    };
  }, [invoices, maintenance]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Financial Dashboard" 
        subtitle="Complete financial oversight & budget management"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              {[
                { id: 'overview', icon: BarChart3, label: 'Overview' },
                { id: 'expenses', icon: PieChartIcon, label: 'Expenses' },
                { id: 'budget', icon: Target, label: 'Budget' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                    view === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {view === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                label: 'Total Revenue', 
                value: financialData.totalRevenue.toLocaleString(), 
                icon: DollarSign, 
                color: 'text-emerald-600', 
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
                suffix: 'LKR',
                trend: '+15.2%',
                positive: true
              },
              { 
                label: 'Total Expenses', 
                value: financialData.totalExpenses.toLocaleString(), 
                icon: Wallet, 
                color: 'text-rose-600', 
                bg: 'bg-rose-50',
                border: 'border-rose-100',
                suffix: 'LKR',
                trend: '+3.8%',
                positive: false
              },
              { 
                label: 'Net Profit', 
                value: financialData.netProfit.toLocaleString(), 
                icon: TrendingUp, 
                color: 'text-indigo-600', 
                bg: 'bg-indigo-50',
                border: 'border-indigo-100',
                suffix: 'LKR',
                trend: '+22.5%',
                positive: true
              },
              { 
                label: 'Profit Margin', 
                value: `${financialData.profitMargin.toFixed(1)}%`, 
                icon: Target, 
                color: 'text-purple-600', 
                bg: 'bg-purple-50',
                border: 'border-purple-100',
                suffix: '',
                trend: '+5.2%',
                positive: true
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <h4 className="text-2xl font-black text-gray-900">{stat.value}</h4>
                      {stat.suffix && <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">{stat.suffix}</p>}
                   </div>
                   <div className={`p-3 rounded-2xl border shadow-sm ${stat.bg} ${stat.border} ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                   </div>
                </div>
                <div className={cn("mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest", stat.positive ? 'text-emerald-600' : 'text-rose-600')}>
                   {stat.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                   <span>{stat.trend} VS PREV MONTH</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm lg:col-span-2"
            >
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Revenue vs Expenses</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Monthly performance</p>
                 </div>
              </div>
              
              <div className="h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData.monthlyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight="bold"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight="bold"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value.toLocaleString()} LKR`, '']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
            >
              <div>
                 <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Expense Breakdown</h3>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">By category</p>
              </div>

              <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData.expenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {financialData.expenses.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value.toLocaleString()} LKR`, '']}
                      />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {financialData.expenses.map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{item.category}</span>
                     </div>
                     <span className="text-xs font-black text-gray-900">{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}

      {view === 'budget' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
             <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Budget vs Actual</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Monthly budget tracking</p>
             </div>
          </div>

          <div className="space-y-6">
            {financialData.budgetData.map((item, idx) => {
              const percentage = (item.spent / item.budget) * 100;
              const isOverBudget = percentage > 100;
              
              return (
                <div key={item.category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{item.spent.toLocaleString()} / {item.budget.toLocaleString()} LKR</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isOverBudget ? 'text-rose-600' : 'text-emerald-600')}>
                        {percentage.toFixed(1)}% {isOverBudget ? 'OVER' : 'used'}
                      </p>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", isOverBudget ? 'bg-rose-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FinancialDashboard;
