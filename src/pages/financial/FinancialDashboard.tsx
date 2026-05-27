import React, { useMemo, useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
} from 'lucide-react';
import { useInvoices } from '../../hooks/useInvoices';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useStaff } from '../../hooks/useStaff';
import { getFuelTransactions, FuelTransaction } from '../../services/fuelStockService';
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
} from 'recharts';
import { cn } from '../../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const FinancialDashboard: React.FC = () => {
  const { invoices, loading: invLoading } = useInvoices();
  const { records: maintenance, loading: maintLoading } = useMaintenance();
  const { staff, loading: staffLoading } = useStaff();
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [fuelLoading, setFuelLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'expenses' | 'budget'>('overview');

  useEffect(() => {
    getFuelTransactions()
      .then(data => setFuelTransactions(data || []))
      .catch(console.error)
      .finally(() => setFuelLoading(false));
  }, []);

  const loading = invLoading || maintLoading || staffLoading || fuelLoading;

  const financialData = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalMaintenanceCost = maintenance.reduce((sum, rec) => sum + rec.cost, 0);

    // Real fuel cost: sum quantity × average price (360 LKR/L default)
    const totalFuelCost = fuelTransactions.reduce(
      (sum, tx) => sum + (tx.quantityIssuedL || 0) * 360,
      0
    );

    // Real salary estimate: sum of active staff basicSalary
    const totalSalaries = staff
      .filter(s => s.active)
      .reduce((sum, s) => sum + (s.basicSalary || 0), 0);

    const expenses = [
      { category: 'Fuel', amount: totalFuelCost, color: '#6366f1' },
      { category: 'Maintenance', amount: totalMaintenanceCost, color: '#f59e0b' },
      { category: 'Salaries', amount: totalSalaries, color: '#10b981' },
    ];

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Monthly data derived from real invoices and maintenance grouped by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap: Record<string, { revenue: number; expenses: number }> = {};

    invoices.forEach(inv => {
      try {
        const m = monthNames[new Date(inv.date).getMonth()];
        if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
        monthMap[m].revenue += inv.totalAmount;
      } catch { /* skip */ }
    });
    maintenance.forEach(rec => {
      try {
        const m = monthNames[new Date(rec.date).getMonth()];
        if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
        monthMap[m].expenses += rec.cost;
      } catch { /* skip */ }
    });
    fuelTransactions.forEach(tx => {
      try {
        const m = monthNames[new Date(tx.date).getMonth()];
        if (!monthMap[m]) monthMap[m] = { revenue: 0, expenses: 0 };
        monthMap[m].expenses += (tx.quantityIssuedL || 0) * 360;
      } catch { /* skip */ }
    });

    const monthlyData = Object.entries(monthMap)
      .map(([month, v]) => ({ month, ...v }))
      .slice(-6);

    const budgetData = [
      { category: 'Fuel', budget: Math.max(totalFuelCost * 1.1, 500000), spent: totalFuelCost },
      { category: 'Maintenance', budget: Math.max(totalMaintenanceCost * 1.2, 300000), spent: totalMaintenanceCost },
      { category: 'Salaries', budget: Math.max(totalSalaries * 1.05, totalSalaries), spent: totalSalaries },
    ];

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      expenses,
      monthlyData,
      budgetData,
    };
  }, [invoices, maintenance, staff, fuelTransactions]);

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
                positive: true,
              },
              {
                label: 'Total Expenses',
                value: financialData.totalExpenses.toLocaleString(),
                icon: Wallet,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                border: 'border-rose-100',
                suffix: 'LKR',
                positive: false,
              },
              {
                label: 'Net Profit',
                value: financialData.netProfit.toLocaleString(),
                icon: TrendingUp,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-100',
                suffix: 'LKR',
                positive: financialData.netProfit >= 0,
              },
              {
                label: 'Profit Margin',
                value: `${financialData.profitMargin.toFixed(1)}%`,
                icon: Target,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100',
                suffix: '',
                positive: financialData.profitMargin >= 0,
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
                   <span>{stat.positive ? 'Positive' : 'Negative'} Balance</span>
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
