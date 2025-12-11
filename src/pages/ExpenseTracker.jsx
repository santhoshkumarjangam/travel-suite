import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Wallet, Download, ArrowLeft, Home, ArrowRight, Plus, DollarSign, TrendingUp, TrendingDown, Trash2, Calendar, Tag, MapPin, Edit2, Globe, Briefcase, ChevronDown, Check } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { useExpenseTrips } from '../context/ExpenseTripContext';
import { usePhotos } from '../context/PhotoContext';
import ExpenseAnalytics from '../components/ExpenseAnalytics';

const ExpenseTracker = () => {
    const { transactions, currency, addTransaction, deleteTransaction, editTransaction, loadExpenses } = useExpenses();
    const { expenseTrips: collections, createExpenseTrip: addTrip, deleteExpenseTrip: deleteTrip } = useExpenseTrips();
    const { currentUser } = usePhotos();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [confirmSettle, setConfirmSettle] = useState(null);
    const [settleAmount, setSettleAmount] = useState('');
    const [activeTripId, setActiveTripId] = useState('all'); // Stores name of debtor being settled
    const [view, setView] = useState('dashboard');
    const [editingId, setEditingId] = useState(null);
    const [newTripName, setNewTripName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTransactionId, setDeleteTransactionId] = useState(null);
    const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);
    const [showCreateTripModal, setShowCreateTripModal] = useState(false);
    const [errors, setErrors] = useState({});

    // Auto-select first trip if 'all' is selected and trips exist
    // This enforces 'Trip Only' mode
    React.useEffect(() => {
        if (activeTripId === 'all' && collections.length > 0) {
            // Prefer 'economiq' source if available
            const ecoTrip = collections.find(c => c.source === 'economiq');
            setActiveTripId(ecoTrip ? ecoTrip.id : collections[0].id);
        }
    }, [collections, activeTripId]);

    // Load Expenses on Trip Change
    React.useEffect(() => {
        if (activeTripId && activeTripId !== 'all') {
            loadExpenses(activeTripId);
        }
    }, [activeTripId]);

    // Filter Transactions
    const filteredTransactions = activeTripId === 'all'
        ? transactions
        : transactions.filter(t => t.collectionId === activeTripId);

    // Calculate Derived Stats for Filtered View
    const getFilteredBalance = () => {
        return filteredTransactions.reduce((acc, curr) => {
            // Treat settled as income (money back)
            return (curr.type === 'income' || curr.type === 'settled')
                ? acc + Number(curr.amount)
                : acc - Number(curr.amount);
        }, 0);
    };

    const getFilteredIncome = () => {
        return filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
    };

    const getFilteredExpense = () => {
        return filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
    };

    const getFilteredLent = () => {
        const lent = filteredTransactions
            .filter(t => t.type === 'lent')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        const settled = filteredTransactions
            .filter(t => t.type === 'settled')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        return lent - settled;
    };

    const handleExport = () => {
        // Prepare Data
        const headers = ["Date", "Description", "Type", "Category", "Amount", "Debtor", "Trip"];
        const rows = transactions.map(t => ({
            "Date": new Date(t.date).toLocaleDateString(),
            "Description": t.description,
            "Type": t.type,
            "Category": t.category,
            "Amount": Number(t.amount), // Keep as number for Excel math
            "Debtor": t.debtor || "",
            "Trip": getCollectionName(t.collectionId) || ""
        }));

        // Create Worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Fix Column Widths (Prevent ######)
        const wscols = [
            { wch: 15 }, // Date
            { wch: 30 }, // Description
            { wch: 10 }, // Type
            { wch: 15 }, // Category
            { wch: 10 }, // Amount
            { wch: 15 }, // Debtor
            { wch: 20 }  // Trip
        ];
        worksheet["!cols"] = wscols;

        // Create Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

        // Write File
        XLSX.writeFile(workbook, "Economiq_Report.xlsx");
    };

    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        category: 'Accommodation', // Default for expense
        type: 'expense',
        collectionId: ''
    });

    // Calculate debts breakdown
    const debtsBreakdown = filteredTransactions
        .reduce((acc, t) => {
            if (t.type === 'lent' || t.type === 'settled') {
                const name = t.debtor ? t.debtor.trim() : 'Unknown';
                const val = Number(t.amount);
                const current = acc[name] || 0;
                // If lent, add. If settled, subtract.
                acc[name] = t.type === 'lent' ? current + val : current - val;
            }
            return acc;
        }, {});

    // Filter out zero or negative debts for display
    Object.keys(debtsBreakdown).forEach(key => {
        if (debtsBreakdown[key] <= 0) delete debtsBreakdown[key];
    });

    const expenseCategories = [
        { id: 'Accommodation', icon: '🏨', color: 'bg-indigo-100 text-indigo-600' },
        { id: 'Flights', icon: '✈️', color: 'bg-blue-100 text-blue-600' },
        { id: 'Food', icon: '🍽️', color: 'bg-orange-100 text-orange-600' },
        { id: 'Activities', icon: '🎫', color: 'bg-purple-100 text-purple-600' },
        { id: 'Transport', icon: '🚕', color: 'bg-yellow-100 text-yellow-600' },
        { id: 'Shopping', icon: '🛍️', color: 'bg-pink-100 text-pink-600' },
        { id: 'Fees', icon: '🛂', color: 'bg-red-100 text-red-600' },
        { id: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-600' }
    ];

    const incomeCategories = [
        { id: 'Salary', icon: '💰', color: 'bg-green-100 text-green-600' },
        { id: 'Refund', icon: '↩️', color: 'bg-blue-100 text-blue-600' },
        { id: 'Freelance', icon: '💻', color: 'bg-purple-100 text-purple-600' },
        { id: 'Investment', icon: '📈', color: 'bg-emerald-100 text-emerald-600' },
        { id: 'Gift', icon: '🎁', color: 'bg-pink-100 text-pink-600' },
        { id: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-600' }
    ];

    // Combine for display lookup
    const allCategories = [...expenseCategories, ...incomeCategories];

    // Select categories based on current type ("lent" also uses expense categories)
    const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!formData.amount) newErrors.amount = true;
        if (!formData.description) newErrors.description = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            let finalCollectionId = formData.collectionId;

            // Handle new trip creation on the fly
            if (finalCollectionId === 'new') {
                if (newTripName.trim()) {
                    // Pass 'economiq' as source
                    const newTrip = await addTrip(newTripName.trim(), null);
                    finalCollectionId = newTrip.id;
                } else {
                    finalCollectionId = '';
                }
            }

            let finalDebtor = formData.debtor;
            if (formData.type === "expense" && currentUser) {
                finalDebtor = currentUser.username || currentUser.name || "Me";
            }

            const transactionData = { ...formData, collectionId: finalCollectionId, debtor: finalDebtor };

            if (editingId) {
                editTransaction(editingId, transactionData);
            } else {
                await addTransaction(transactionData);
            }

            resetForm(finalCollectionId);
        } catch (error) {
            console.error("Failed to save transaction:", error);
        }
    };

    const resetForm = (stickyTripId) => {
        // Sticky logic
        let nextTrip = (typeof stickyTripId === 'string') ? stickyTripId : formData.collectionId;
        if (nextTrip === 'new') nextTrip = '';

        setFormData({
            amount: '',
            description: '',
            category: 'Accommodation',
            type: 'expense',
            collectionId: nextTrip || ''
        });
        setNewTripName('');
        setErrors({});
        setEditingId(null);
        setShowAddModal(false);
    };

    const handleEdit = (t) => {
        setFormData({
            amount: t.amount,
            description: t.description,
            category: t.category,
            type: t.type,
            collectionId: t.collectionId || '',
            debtor: t.debtor || ''
        });
        setEditingId(t.id);
        setShowAddModal(true);
    };

    const getCollectionName = (id) => {
        const col = collections.find(c => c.id === id);
        return col ? col.name : null;
    };

    // Helper to handle type switching and resetting default category
    const handleOpenAddModal = () => {
        // Enforce Trip Creation
        if (activeTripId === 'all') {
            setShowCreateTripModal(true);
            return;
        }

        // Explicitly initialize form with Active Trip
        setFormData({
            amount: '',
            description: '',
            category: 'Accommodation',
            type: 'expense',
            collectionId: activeTripId,
            debtor: ''
        });
        setErrors({});
        setEditingId(null);
        setShowAddModal(true);
    };

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        if (newTripName.trim()) {
            const newTrip = await addTrip(newTripName.trim(), null, 0.0);
            setActiveTripId(newTrip.id);
            setNewTripName('');
            setShowCreateTripModal(false);
            // Visual feedback handled by state change
        }
    };


    const handleDeleteTrip = async () => {
        if (activeTripId && activeTripId !== 'all') {
            await deleteTrip(activeTripId);
            setActiveTripId('all');
            setShowDeleteConfirm(false);
        }
    };

    const handleTypeChange = (newType) => {
        let defaultCat = 'Accommodation';
        if (newType === 'income') defaultCat = 'Salary';
        if (newType === 'lent') defaultCat = 'Other';

        setFormData({ ...formData, type: newType, category: defaultCat });
    };



    return (
        <div className="h-screen overflow-hidden bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <NavLink to="/" className="flex items-center gap-2 p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors group">
                        <Home size={20} className="text-gray-500 group-hover:text-black transition-colors" />
                        <span className="hidden md:inline font-medium text-gray-500 group-hover:text-black transition-colors">Home</span>
                    </NavLink>
                    <div className="flex items-center gap-2">
                        <img src="/economiq-logo.png" alt="Economiq Logo" className="w-8 h-8 rounded-lg object-contain" />
                        <span className="font-bold text-xl tracking-tight text-gray-900">Economiq</span>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setView('analytics')}
                        className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${view === 'analytics' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Analytics
                    </button>
                </div>

                {/* Trip Context Switcher (Custom Dropdown) */}
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                    <button
                        onClick={handleOpenAddModal}
                        className="hidden md:flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-black text-white rounded-lg sm:rounded-xl hover:bg-gray-800 transition-all font-bold text-xs sm:text-sm shadow-sm"
                    >
                        <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden md:inline">Add Expense</span>
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={filteredTransactions.length === 0}
                        className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-50 text-gray-600 rounded-lg sm:rounded-xl transition-colors font-bold text-xs sm:text-sm ${filteredTransactions.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 hover:text-black"}`}
                    >
                        <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden md:inline">Export Data</span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                            className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm min-w-[80px] sm:min-w-[100px] md:min-w-[160px] justify-between"
                        >
                            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                {activeTripId === "all" ? <Globe size={14} className="flex-shrink-0 text-gray-400 sm:w-4 sm:h-4" /> : <Briefcase size={14} className="flex-shrink-0 text-indigo-600 sm:w-4 sm:h-4" />}
                                <span className="truncate max-w-[50px] sm:max-w-[80px] md:max-w-[120px]">
                                    {activeTripId === "all" ? "No Trips Created" : getCollectionName(activeTripId)}
                                </span>
                            </div>
                            <ChevronDown size={12} className={`flex-shrink-0 text-gray-400 transition-transform sm:w-[14px] sm:h-[14px] ${isTripDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isTripDropdownOpen && (
                            <div className="fixed md:absolute top-[72px] md:top-full left-0 right-0 md:left-auto md:right-0 mx-4 md:mx-0 md:mt-2 md:w-64 bg-black border border-gray-800 rounded-2xl shadow-2xl z-[160] overflow-hidden">
                                <div className="p-1">
                                    <div className="max-h-64 overflow-y-auto space-y-1">
                                        {collections.map(col => (
                                            <button
                                                key={col.id}
                                                onClick={() => { setActiveTripId(col.id); setIsTripDropdownOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${activeTripId === col.id ? "bg-white text-black" : "hover:bg-gray-800 text-white"}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${activeTripId === col.id ? "bg-black" : "bg-gray-800"}`}>
                                                    <Briefcase size={14} className={activeTripId === col.id ? "text-white" : "text-gray-400"} />
                                                </div>
                                                <span className="font-medium text-left flex-1 truncate">{col.name}</span>
                                                {activeTripId === col.id && <Check size={14} className="flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-2 border-t border-gray-800">
                                    <button
                                        onClick={() => { setShowCreateTripModal(true); setIsTripDropdownOpen(false); }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={16} />
                                        <span>Create New Trip</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Backdrop to close */}
                        {isTripDropdownOpen && (
                            <div className="fixed inset-0 z-[150]" onClick={() => setIsTripDropdownOpen(false)} />
                        )}
                    </div>

                    {activeTripId !== "all" && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-1.5 sm:p-2 bg-red-50 text-red-500 rounded-lg sm:rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Delete this trip"
                        >
                            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    )}
                </div>
            </header>
            {/* Mobile View Toggle (Sub-header) */}
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-center sticky top-[65px] z-[5]">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-xs">
                    <button
                        onClick={() => setView("dashboard")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "dashboard" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setView("analytics")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "analytics" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
                    >
                        Analytics
                    </button>
                </div>
            </div>

            {/* Floating Action Button (Mobile Only) */}
            <button
                onClick={handleOpenAddModal}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform"
                aria-label="Add Expense"
            >
                <Plus size={24} />
            </button>


            <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col overflow-hidden relative">
                {view === 'dashboard' ? (
                    <>
                        {/* Balance Cards */}
                        <div className="flex-none grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-6 z-10">
                            <div className="min-w-0 bg-black text-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-lg shadow-black/5 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Total Balance</p>
                                    <h2 className="text-base sm:text-lg md:text-2xl font-bold tracking-tight">{currency}{getFilteredBalance().toLocaleString()}</h2>
                                </div>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center text-white">
                                    <Wallet size={16} className="sm:w-5 sm:h-5" />
                                </div>
                            </div>

                            <div className="min-w-0 bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Income</p>
                                    <h3 className="text-base sm:text-lg md:text-2xl font-bold text-emerald-600">+{currency}{getFilteredIncome().toLocaleString()}</h3>
                                </div>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <TrendingUp size={16} className="sm:w-5 sm:h-5" />
                                </div>
                            </div>

                            <div className="min-w-0 bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Expenses</p>
                                    <h3 className="text-base sm:text-lg md:text-2xl font-bold text-red-600">-{currency}{getFilteredExpense().toLocaleString()}</h3>
                                </div>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                    <TrendingDown size={16} className="sm:w-5 sm:h-5" />
                                </div>
                            </div>

                            <div
                                onClick={() => setShowDebtModal(true)}
                                className="min-w-0 bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow group"
                            >
                                <div>
                                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 group-hover:text-orange-600 transition-colors">Owed to you</p>
                                    <h3 className="text-base sm:text-lg md:text-2xl font-bold text-orange-600">{currency}{getFilteredLent().toLocaleString()}</h3>
                                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-400 mt-0.5 sm:mt-1 flex items-center gap-1">View Details <ArrowRight size={10} className="sm:w-3 sm:h-3" /></p>
                                </div>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                    <span className="text-base sm:text-lg">🤝</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 pb-20 sm:pb-24 min-h-0">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 sticky top-0 bg-gray-50 py-2 z-10">Recent Transactions</h3>
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
                                        <DollarSign size={24} />
                                    </div>
                                    <p className="text-gray-500">No transactions yet.</p>
                                    <button
                                        onClick={handleOpenAddModal}
                                        className="text-blue-600 font-medium mt-2 hover:underline"
                                    >
                                        Add your first expense
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3"><AnimatePresence mode="popLayout">
                                    {filteredTransactions.map((t) => {
                                        // Lookup from ALL categories to handle both types correctly in history
                                        const cat = allCategories.find(c => c.id === t.category) || allCategories[allCategories.length - 1];
                                        const tripName = getCollectionName(t.collectionId);
                                        const isIncome = t.type === 'income';
                                        const isSettled = t.type === 'settled';
                                        const isLent = t.type === 'lent';



                                        return (
                                            <motion.div
                                                key={t.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm md:hover:shadow-md transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden"><div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg ${cat.color}`}>
                                                    {isLent ? '🤝' : cat.icon}
                                                </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 truncate">
                                                            {isLent && t.debtor ? <span className="text-orange-600 text-sm font-bold uppercase mr-1">To {t.debtor}:</span> : null}
                                                            {t.description}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium">{t.category}</span>

                                                            <span>•</span>
                                                            <span>{new Date(t.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 md:gap-4 shrink-0 pl-2"><span className={`whitespace-nowrap font-bold ${(isIncome || isSettled) ? 'text-emerald-600' : isLent ? 'text-orange-600' : 'text-red-600'}`}>
                                                    {(isIncome || isSettled) ? '+' : '-'}{currency}{Number(t.amount).toLocaleString()}
                                                </span>
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-gray-400 md:hover:text-blue-500 md:hover:bg-blue-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTransactionId(t.id)}
                                                        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-gray-400 md:hover:text-red-500 md:hover:bg-red-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <ExpenseAnalytics transactions={filteredTransactions} />
                )}
            </main>

            {/* Delete Trip Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center p-2">
                            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Trip?</h2>
                            <p className="text-gray-500 mb-6">
                                Are you sure you want to delete <span className="font-bold text-gray-900">{getCollectionName(activeTripId)}</span>?
                                This cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteTrip}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Trip Modal */}
            {showCreateTripModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Create New Trip</h2>
                            <button onClick={() => setShowCreateTripModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTrip} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Trip Name</label>
                                <input
                                    type="text"
                                    value={newTripName}
                                    onChange={(e) => setNewTripName(e.target.value)}
                                    placeholder="e.g. Summer 2024"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none font-medium"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newTripName.trim()}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Briefcase size={18} />
                                Create Trip
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">Close</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Type Selection */}
                            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('expense')}
                                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('lent')}
                                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'lent' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Paid for...
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('income')}
                                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Income
                                </button>
                            </div>

                            {/* Debtor Name (Only for Lent) */}
                            {formData.type === 'lent' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200 mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Who is this for?</label>
                                    <input
                                        type="text"
                                        value={formData.debtor || ''}
                                        onChange={(e) => setFormData({ ...formData, debtor: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                        placeholder="e.g. John, Mom, Alice..."
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{formData.type === 'lent' ? 'Amount Owed' : 'Amount'}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">{currency}</span>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => { setFormData({ ...formData, amount: e.target.value }); if (errors.amount) setErrors({ ...errors, amount: false }); }}
                                        className={`w-full pl-8 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none font-bold text-lg transition-colors ${errors.amount ? 'bg-red-50 border border-red-500 ring-1 ring-red-500 placeholder-red-300' : 'bg-gray-50 border-gray-200'}`}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => { setFormData({ ...formData, description: e.target.value }); if (errors.description) setErrors({ ...errors, description: false }); }}
                                    className={`w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-colors ${errors.description ? 'bg-red-50 border border-red-500 ring-1 ring-red-500 placeholder-red-300' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="What was this for?"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {currentCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${formData.category === cat.id ? 'border-black bg-black/5 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <span className="text-xl mb-1">{cat.icon}</span>
                                            <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">{cat.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-black/10 hover:bg-gray-900 transition-colors mt-4">
                                Save Transaction
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Debt Summary Modal */}
            {showDebtModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Who Owes You</h2>
                            <button onClick={() => setShowDebtModal(false)} className="text-gray-400 hover:text-gray-600">Close</button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(debtsBreakdown).length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No one owes you anything properly yet!</p>
                            ) : (
                                Object.entries(debtsBreakdown).map(([name, amount]) => (
                                    <div key={name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-lg">
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-gray-900 truncate">{name}</span>
                                        </div>
                                        <span className="font-bold text-orange-600 mr-4">{currency}{amount.toLocaleString()}</span>
                                        {confirmSettle === name ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={settleAmount}
                                                    onChange={(e) => setSettleAmount(e.target.value)}
                                                    className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-600 outline-none font-bold text-gray-700"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const val = Number(settleAmount);
                                                        if (!val || val <= 0) return;

                                                        addTransaction({
                                                            amount: val,
                                                            description: `Settled by ${name}`,
                                                            category: "Repayment",
                                                            type: "settled",
                                                            debtor: name,
                                                            collectionId: activeTripId
                                                        });
                                                        setConfirmSettle(null);
                                                    }}
                                                    className="px-3 py-1 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setConfirmSettle(null)}
                                                    className="px-2 py-1 bg-gray-200 text-gray-500 font-bold text-xs rounded-lg hover:bg-gray-300 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setConfirmSettle(name); setSettleAmount(amount); }}
                                                className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-lg hover:bg-green-200 transition-colors"
                                            >
                                                Settle
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center bg-white">
                            <span className="text-gray-500 font-medium">Total Pending</span>
                            <span className="text-xl font-bold text-gray-900">{currency}{getFilteredLent().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Transaction Confirmation Modal */}
            {deleteTransactionId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Delete Transaction?</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setDeleteTransactionId(null)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteTransaction(deleteTransactionId);
                                    setDeleteTransactionId(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTracker;









































