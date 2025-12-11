import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { usePhotos } from './PhotoContext';

const ExpenseTripContext = createContext();

export const useExpenseTrips = () => useContext(ExpenseTripContext);

const baseURL = 'http://localhost:8000';

export const ExpenseTripProvider = ({ children }) => {
    const [expenseTrips, setExpenseTrips] = useState([]);
    const { currentUser } = usePhotos();

    useEffect(() => {
        const fetchExpenseTrips = async () => {
            if (currentUser) {
                try {
                    const token = sessionStorage.getItem('token');
                    const response = await axios.get(`${baseURL}/expense-trips/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setExpenseTrips(response.data);
                } catch (error) {
                    console.error("Failed to fetch expense trips", error);
                }
            } else {
                setExpenseTrips([]);
            }
        };
        fetchExpenseTrips();
    }, [currentUser]);

    const createExpenseTrip = async (name, description = null, budget = 0.0) => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.post(
                `${baseURL}/expense-trips/`,
                { name, description, budget },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newTrip = response.data;
            setExpenseTrips(prev => [...prev, newTrip]);
            return newTrip;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const deleteExpenseTrip = async (id) => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${baseURL}/expense-trips/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenseTrips(prev => prev.filter(t => t.id !== id));
            return { success: true };
        } catch (error) {
            console.error("Failed to delete expense trip:", error);
            if (error.response?.status === 403) {
                return {
                    success: false,
                    message: "You don't have permission to delete this trip. Only the trip creator can delete it."
                };
            }
            return {
                success: false,
                message: "Failed to delete trip. Please try again."
            };
        }
    };

    const getExpenseTrip = (id) => {
        return expenseTrips.find(t => t.id === id);
    };

    const value = {
        expenseTrips,
        createExpenseTrip,
        deleteExpenseTrip,
        getExpenseTrip
    };

    return (
        <ExpenseTripContext.Provider value={value}>
            {children}
        </ExpenseTripContext.Provider>
    );
};
