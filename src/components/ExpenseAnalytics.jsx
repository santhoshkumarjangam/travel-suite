import React, { useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';

const ExpenseAnalytics = ({ transactions: propTransactions }) => {
    const { transactions: contextTransactions, currency } = useExpenses();
    const transactions = propTransactions || contextTransactions;

    // Categories config (matching ExpenseTracker.jsx)
    const categoryConfig = {
        'Accommodation': { color: '#06b6d4', label: 'Hotels' },       // Cyan-500
        'Flights': { color: '#3b82f6', label: 'Flights' },             // Blue-500
        'Food': { color: '#f97316', label: 'Food' },                   // Orange-500
        'Activities': { color: '#8b5cf6', label: 'Activities' },       // Violet-500
        'Transport': { color: '#84cc16', label: 'Transport' },         // Lime-500
        'Shopping': { color: '#ec4899', label: 'Shopping' },           // Pink-500
        'Fees': { color: '#ef4444', label: 'Fees' },                   // Red-500
        'Other': { color: '#64748b', label: 'Other' }                  // Slate-500
    };

    const data = useMemo(() => {
        const expenseTx = transactions.filter(t => t.type === 'expense');
        const total = expenseTx.reduce((acc, t) => acc + Number(t.amount), 0);

        const byCategory = expenseTx.reduce((acc, t) => {
            const cat = t.category || 'Other';
            acc[cat] = (acc[cat] || 0) + Number(t.amount);
            return acc;
        }, {});

        // Convert to array and sort by amount desc
        return Object.entries(byCategory)
            .map(([cat, amount]) => ({
                id: cat,
                label: categoryConfig[cat]?.label || cat,
                amount,
                percentage: total > 0 ? (amount / total) * 100 : 0,
                color: categoryConfig[cat]?.color || '#9ca3af'
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0), [transactions]);

    // Create conic gradient string
    const conicGradient = useMemo(() => {
        if (data.length === 0) return 'conic-gradient(#f3f4f6 0% 100%)';

        let currentDeg = 0;
        const stops = data.map(d => {
            const start = currentDeg;
            const deg = (d.percentage / 100) * 360;
            currentDeg += deg;
            return `${d.color} ${start}deg ${currentDeg}deg`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    }, [data]);

    if (totalExpense === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400">No expenses to analyze yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Chart Section */}
            <div className="flex flex-col items-center justify-center py-8">
                <div
                    className="w-64 h-64 rounded-full relative flex items-center justify-center shadow-xl shadow-gray-200/50"
                    style={{ background: conicGradient }}
                >
                    {/* Inner Circle (Donut) */}
                    <div className="w-48 h-48 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Spent</span>
                        <span className="text-3xl font-bold text-gray-900 mt-1">{currency}{totalExpense.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Breakdown List */}
            <div className="grid grid-cols-1 gap-4">
                {data.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-3 h-12 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <div>
                                <h4 className="font-semibold text-gray-900">{item.label}</h4>
                                <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</p>
                            </div>
                        </div>
                        <span className="font-bold text-gray-900">
                            {currency}{item.amount.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExpenseAnalytics;


