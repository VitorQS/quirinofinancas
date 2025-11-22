import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    
    return Object.keys(data).map(key => ({
      name: key,
      value: data[key]
    }));
  }, [transactions]);

  return (
    <div className="w-full space-y-4 mb-6">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-semibold uppercase">Saldo</span>
          <span className={`text-lg font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            R$ {stats.balance.toFixed(2)}
          </span>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-semibold uppercase">Entradas</span>
          <span className="text-lg font-bold text-emerald-600">R$ {stats.income.toFixed(2)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-500 font-semibold uppercase">Saídas</span>
          <span className="text-lg font-bold text-red-500">R$ {stats.expense.toFixed(2)}</span>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-1 text-sm">
            <h3 className="font-semibold text-gray-700 mb-2">Despesas por Categoria</h3>
            {categoryData.slice(0, 5).map((item, index) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium">R$ {item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
