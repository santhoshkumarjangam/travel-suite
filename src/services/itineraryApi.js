// Itinerary API service for Tripify

import api from './api';

export const itinerary = {
    // Trip endpoints
    createTrip: (tripData) => api.post('/itinerary/trips', tripData),
    getTrips: () => api.get('/itinerary/trips'),
    getTrip: (tripId) => api.get(`/itinerary/trips/${tripId}`),
    updateTrip: (tripId, tripData) => api.put(`/itinerary/trips/${tripId}`, tripData),
    deleteTrip: (tripId) => api.delete(`/itinerary/trips/${tripId}`),
    joinTrip: (joinCode) => api.post('/itinerary/trips/join', { join_code: joinCode }),

    // Day endpoints
    createDay: (tripId, dayData) => api.post(`/itinerary/trips/${tripId}/days`, dayData),
    getTripDays: (tripId) => api.get(`/itinerary/trips/${tripId}/days`),
    updateDay: (dayId, dayData) => api.put(`/itinerary/days/${dayId}`, dayData),
    deleteDay: (dayId) => api.delete(`/itinerary/days/${dayId}`),

    // Activity endpoints
    createActivity: (dayId, activityData) => api.post(`/itinerary/days/${dayId}/activities`, activityData),
    getDayActivities: (dayId) => api.get(`/itinerary/days/${dayId}/activities`),
    updateActivity: (activityId, activityData) => api.put(`/itinerary/activities/${activityId}`, activityData),
    deleteActivity: (activityId) => api.delete(`/itinerary/activities/${activityId}`),
    uploadActivityPhoto: (activityId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/itinerary/activities/${activityId}/upload-photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Packing list endpoints
    createPackingItem: (tripId, itemData) => api.post(`/itinerary/trips/${tripId}/packing`, itemData),
    getPackingList: (tripId) => api.get(`/itinerary/trips/${tripId}/packing`),
    togglePacked: (itemId) => api.patch(`/itinerary/packing/${itemId}/toggle`),
    deletePackingItem: (itemId) => api.delete(`/itinerary/packing/${itemId}`)
};
