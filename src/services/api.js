import axios from 'axios';

// Create Axios Instance
const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('photoApp_user');
            // Optionally redirect to login or trigger global state refresh
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (name, email, password) => api.post('/auth/register', { name, email, password }),
};

export const trips = {
    getAll: () => api.get('/trips/'),
    create: (data) => api.post('/trips/', data),
    join: (code) => api.post('/trips/join', { code }),
    getDetails: (id) => api.get(`/trips/${id}`),
    delete: (id) => api.delete(`/trips/${id}`),
};

export const expenses = {
    getByTrip: (tripId) => api.get(`/expenses/trip/${tripId}`),
    create: (data) => api.post('/expenses/', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

export const users = {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data) => api.put('/users/me', data),
    deleteAccount: () => api.delete('/users/me'),
};

export const media = {
    // Direct upload to GCS via backend
    upload: async (file, tripId = null) => {
        const formData = new FormData();
        formData.append('file', file);
        if (tripId) {
            formData.append('trip_id', tripId);
        }

        return api.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Get all media for a trip
    getByTrip: (tripId) => api.get(`/media/trip/${tripId}`),

    // Toggle favorite
    toggleFavorite: (mediaId, isFavorite) =>
        api.patch(`/media/${mediaId}`, { is_favorite: isFavorite }),

    // Delete media
    delete: (mediaId) => api.delete(`/media/${mediaId}`),

    // Download media
    download: (mediaId) => {
        const token = sessionStorage.getItem('token');
        const url = `${api.defaults.baseURL}/media/${mediaId}/download`;

        // Open in new tab to trigger download
        window.open(`${url}?token=${token}`, '_blank');
    },

    // Get download URLs for all trip media
    getTripDownloadUrls: (tripId) => api.get(`/media/trip/${tripId}/download-all`),
};

export default api;
