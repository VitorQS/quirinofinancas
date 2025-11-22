import React, { useMemo } from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  
  // Group transactions by date string (YYYY-MM-DD)
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    // Sort all transactions by date desc first
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
      const dateKey = new Date(t.date).toLocaleDateString('pt-BR'); // Gets local date format
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    
    return groups;
  }, [transactions]);

  const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString('pt-BR');

    if (dateStr === today) return 'Hoje';
    if (dateStr === yesterday) return 'Ontem';
    return dateStr;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 mt-4">
        <p className="text-gray-400 mb-1">Nenhum registro neste mês.</p>
        <p className="text-xs text-emerald-600 font-medium">Diga ao Quirino para começar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {Object.entries(groupedTransactions).map(([dateLabel, items]: [string, Transaction[]]) => (
        <div key={dateLabel} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-gray-600">
              {getRelativeDateLabel(dateLabel)}
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {items.length} registro(s)
            </span>
          </div>
          
          <ul className="divide-y divide-gray-50">
            {items.map((t) => (
              <li key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {t.type === 'income' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-1">{t.description}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{t.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  <span className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </span>
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    title="Excluir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;