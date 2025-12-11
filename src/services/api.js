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
    getUploadUrl: (filename, contentType, size, tripId = null) =>
        api.post('/media/upload-url', {
            filename,
            content_type: contentType,
            size_bytes: size,
            trip_id: tripId
        }),
    // Helper to upload to GCS directly (PUT)
    uploadFile: async (url, file) => {
        return axios.put(url, file, {
            headers: {
                'Content-Type': file.type,
            }
        });
    },
    getByTrip: (tripId) => api.get(`/media/trip/${tripId}`),
};

export default api;
