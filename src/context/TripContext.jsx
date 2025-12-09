import React, { createContext, useContext, useState, useEffect } from 'react';
import { trips as tripsApi } from '../services/api';
import { usePhotos } from './PhotoContext';

const TripContext = createContext();

export const useTrips = () => useContext(TripContext);

export const TripProvider = ({ children }) => {
    // Structure: { id, name, date, coverPhoto, joinCode, members: [] }
    const [trips, setTrips] = useState([]);
    const { currentUser } = usePhotos();

    useEffect(() => {
        const fetchTrips = async () => {
            if (currentUser) {
                try {
                    const response = await tripsApi.getAll();
                    setTrips(response.data);
                } catch (error) {
                    console.error("Failed to fetch trips", error);
                }
            } else {
                setTrips([]);
            }
        };
        fetchTrips();
    }, [currentUser]);



    const addTrip = async (name, cover = null) => {
        try {
            const response = await tripsApi.create({ name, cover_photo_url: cover });
            const newTrip = response.data;
            setTrips(prev => [...prev, newTrip]);
            return newTrip;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const deleteTrip = (id) => {
        setTrips(prev => prev.filter(t => t.id !== id));
    };

    const joinTrip = async (code) => {
        try {
            const response = await tripsApi.join(code);
            const trip = response.data;
            setTrips(prev => {
                if (prev.find(t => t.id === trip.id)) return prev;
                return [...prev, trip];
            });
            return true;
        } catch (error) {
            return false;
        }
    };

    const getTrip = (id) => {
        return trips.find(t => t.id === id);
    };

    const value = {
        trips,
        addTrip,
        deleteTrip,
        joinTrip,
        getTrip
    };

    return (
        <TripContext.Provider value={value}>
            {children}
        </TripContext.Provider>
    );
};
