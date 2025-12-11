import React, { createContext, useContext, useState, useEffect } from 'react';
import { expenses as expensesApi } from '../services/api';


const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
    // Structure: { id, amount, description, category, date, type: 'income' | 'expense' }
    const [transactions, setTransactions] = useState([]);

    const loadExpenses = async (tripId) => {
        if (!tripId) return;
        try {
            const response = await expensesApi.getByTrip(tripId);
            // Map backend fields to frontend fields
            const mappedTransactions = response.data.map(tx => ({
                ...tx,
                collectionId: tx.trip_id,
                debtor: tx.split_details?.debtor || null
            }));
            setTransactions(mappedTransactions);
        } catch (error) {
            console.error("Failed to load expenses", error);
        }
    };

    const addTransaction = async (transaction) => {
        try {
            const payload = {
                trip_id: transaction.collectionId,
                amount: Number(transaction.amount),
                description: transaction.description,
                category: transaction.category,
                type: transaction.type,
                date: transaction.date || new Date().toISOString(),
                split_details: transaction.debtor ? { debtor: transaction.debtor } : {}
            };
            const response = await expensesApi.create(payload);
            const newTx = { ...transaction, id: response.data.id, ...response.data };
            setTransactions(prev => [newTx, ...prev]);
            return newTx;
        } catch (error) {
            console.error("Failed to add transaction", error);
            throw error;
        }
    };

    const deleteTransaction = async (id) => {
        try {
            await expensesApi.delete(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) { console.error(error); }
    };

    const editTransaction = async (id, updatedData) => {
        try {
            const response = await expensesApi.update(id, updatedData);
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...response.data } : t));
        } catch (error) {
            console.error("Failed to edit transaction", error);
            throw error;
        }
    };

    const deleteExpensesByTrip = (tripId) => {
        setTransactions(prev => prev.filter(t => t.collectionId !== tripId));
    };

    const getBalance = () => {
        return transactions.reduce((acc, curr) => {
            return (curr.type === 'income' || curr.type === 'settled')
                ? acc + Number(curr.amount)
                : acc - Number(curr.amount);
        }, 0);
    };

    const getIncome = () => {
        return transactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
    };

    const getExpense = () => {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
    };

    const getLent = () => {
        const lent = transactions
            .filter(t => t.type === 'lent')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        const settled = transactions
            .filter(t => t.type === 'settled')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        return lent - settled;
    };

    const value = {
        transactions,
        currency: '₹', // Default currency
        addTransaction,
        deleteTransaction,
        editTransaction,
        getBalance,
        getIncome,
        getExpense,
        getLent,
        deleteExpensesByTrip,
        loadExpenses
    };

    return (
        <ExpenseContext.Provider value={value}>
            {children}
        </ExpenseContext.Provider>
    );
};




