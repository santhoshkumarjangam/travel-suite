import React, { createContext, useContext, useState, useEffect } from 'react';
import { itinerary } from '../services/itineraryApi';
import { usePhotos } from './PhotoContext';

const ItineraryContext = createContext();

export const ItineraryProvider = ({ children }) => {
    const { currentUser } = usePhotos();
    const [trips, setTrips] = useState([]);
    const [currentTrip, setCurrentTrip] = useState(null);
    const [days, setDays] = useState([]);
    const [activities, setActivities] = useState({});  // { dayId: [activities] }
    const [packingList, setPackingList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load user's trips
    const loadTrips = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const response = await itinerary.getTrips();
            setTrips(response.data);
        } catch (error) {
            console.error('Failed to load trips', error);
        } finally {
            setLoading(false);
        }
    };

    // Load trip details
    const loadTrip = async (tripId) => {
        try {
            setLoading(true);
            const response = await itinerary.getTrip(tripId);
            setCurrentTrip(response.data);
            await loadTripDays(tripId);
            await loadPackingList(tripId);
        } catch (error) {
            console.error('Failed to load trip', error);
        } finally {
            setLoading(false);
        }
    };

    // Load days for trip
    const loadTripDays = async (tripId) => {
        try {
            const response = await itinerary.getTripDays(tripId);
            setDays(response.data);

            // Load activities for each day
            for (const day of response.data) {
                await loadDayActivities(day.id);
            }
        } catch (error) {
            console.error('Failed to load days', error);
        }
    };

    // Load activities for a day
    const loadDayActivities = async (dayId) => {
        try {
            const response = await itinerary.getDayActivities(dayId);
            setActivities(prev => ({
                ...prev,
                [dayId]: response.data
            }));
        } catch (error) {
            console.error('Failed to load activities', error);
        }
    };

    // Load packing list
    const loadPackingList = async (tripId) => {
        try {
            const response = await itinerary.getPackingList(tripId);
            setPackingList(response.data);
        } catch (error) {
            console.error('Failed to load packing list', error);
        }
    };

    // Create trip
    const createTrip = async (tripData) => {
        try {
            const response = await itinerary.createTrip(tripData);
            setTrips(prev => [...prev, response.data]);
            return response.data;
        } catch (error) {
            console.error('Failed to create trip', error);
            throw error;
        }
    };

    // Join trip
    const joinTrip = async (joinCode) => {
        try {
            const response = await itinerary.joinTrip(joinCode);
            setTrips(prev => [...prev, response.data]);
            return response.data;
        } catch (error) {
            console.error('Failed to join trip', error);
            throw error;
        }
    };

    // Update trip
    const updateTrip = async (tripId, tripData) => {
        try {
            const response = await itinerary.updateTrip(tripId, tripData);
            setTrips(prev => prev.map(t => t.id === tripId ? response.data : t));
            if (currentTrip?.id === tripId) {
                setCurrentTrip(response.data);
            }
            return response.data;
        } catch (error) {
            console.error('Failed to update trip', error);
            throw error;
        }
    };

    // Delete trip
    const deleteTrip = async (tripId) => {
        try {
            await itinerary.deleteTrip(tripId);
            setTrips(prev => prev.filter(t => t.id !== tripId));
            if (currentTrip?.id === tripId) {
                setCurrentTrip(null);
            }
        } catch (error) {
            console.error('Failed to delete trip', error);
            throw error;
        }
    };

    // Add day
    const addDay = async (tripId, dayData) => {
        try {
            const response = await itinerary.createDay(tripId, dayData);
            setDays(prev => [...prev, response.data].sort((a, b) => a.day_number - b.day_number));
            return response.data;
        } catch (error) {
            console.error('Failed to add day', error);
            throw error;
        }
    };

    // Update day
    const updateDay = async (dayId, dayData) => {
        try {
            const response = await itinerary.updateDay(dayId, dayData);
            setDays(prev => prev.map(d => d.id === dayId ? response.data : d));
            return response.data;
        } catch (error) {
            console.error('Failed to update day', error);
            throw error;
        }
    };

    // Delete day
    const deleteDay = async (dayId) => {
        try {
            await itinerary.deleteDay(dayId);
            setDays(prev => prev.filter(d => d.id !== dayId));
            setActivities(prev => {
                const newActivities = { ...prev };
                delete newActivities[dayId];
                return newActivities;
            });
        } catch (error) {
            console.error('Failed to delete day', error);
            throw error;
        }
    };

    // Add activity
    const addActivity = async (dayId, activityData) => {
        try {
            const response = await itinerary.createActivity(dayId, activityData);
            setActivities(prev => ({
                ...prev,
                [dayId]: [...(prev[dayId] || []), response.data].sort((a, b) => a.order_index - b.order_index)
            }));
            return response.data;
        } catch (error) {
            console.error('Failed to add activity', error);
            throw error;
        }
    };

    // Update activity
    const updateActivity = async (activityId, activityData) => {
        try {
            const response = await itinerary.updateActivity(activityId, activityData);
            const dayId = response.data.day_id;
            setActivities(prev => ({
                ...prev,
                [dayId]: (prev[dayId] || []).map(a => a.id === activityId ? response.data : a)
            }));
            return response.data;
        } catch (error) {
            console.error('Failed to update activity', error);
            throw error;
        }
    };

    // Delete activity
    const deleteActivity = async (activityId, dayId) => {
        try {
            await itinerary.deleteActivity(activityId);
            setActivities(prev => ({
                ...prev,
                [dayId]: (prev[dayId] || []).filter(a => a.id !== activityId)
            }));
        } catch (error) {
            console.error('Failed to delete activity', error);
            throw error;
        }
    };

    // Add packing item
    const addPackingItem = async (tripId, itemData) => {
        try {
            const response = await itinerary.createPackingItem(tripId, itemData);
            setPackingList(prev => [...prev, response.data]);
            return response.data;
        } catch (error) {
            console.error('Failed to add packing item', error);
            throw error;
        }
    };

    // Toggle packed
    const togglePacked = async (itemId) => {
        try {
            const response = await itinerary.togglePacked(itemId);
            setPackingList(prev => prev.map(item => item.id === itemId ? response.data : item));
        } catch (error) {
            console.error('Failed to toggle packed', error);
            throw error;
        }
    };

    // Delete packing item
    const deletePackingItem = async (itemId) => {
        try {
            await itinerary.deletePackingItem(itemId);
            setPackingList(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error('Failed to delete packing item', error);
            throw error;
        }
    };

    // Load trips on mount
    useEffect(() => {
        if (currentUser) {
            loadTrips();
        }
    }, [currentUser]);

    return (
        <ItineraryContext.Provider value={{
            trips,
            currentTrip,
            days,
            activities,
            packingList,
            loading,
            loadTrips,
            loadTrip,
            createTrip,
            joinTrip,
            updateTrip,
            deleteTrip,
            addDay,
            updateDay,
            deleteDay,
            addActivity,
            updateActivity,
            deleteActivity,
            addPackingItem,
            togglePacked,
            deletePackingItem,
        }}>
            {children}
        </ItineraryContext.Provider>
    );
};

export const useItinerary = () => useContext(ItineraryContext);
