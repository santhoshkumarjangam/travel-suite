import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import heic2any from 'heic2any';
import { auth, media, users } from '../services/api';

const PhotoContext = createContext();

export const usePhotos = () => useContext(PhotoContext);

export const PhotoProvider = ({ children }) => {
    // Photos array: { id, uploader, file, previewUrl, timestamp, description, collectionId, isFavorite }
    const [photos, setPhotos] = useState([]);

    // User Identity
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Strict Backend Sync: Fetch profile on mount if token exists
    useEffect(() => {
        const initAuth = async () => {
            const token = sessionStorage.getItem('token');
            if (token) {
                try {
                    const profile = await users.getProfile();
                    const user = profile.data;
                    if (!user.name) user.name = user.email ? user.email.split('@')[0] : 'Member';
                    setCurrentUser(user);
                } catch (e) {
                    console.error("Failed to fetch profile", e);
                    // If fetch fails (e.g. 401), we should probably clear token
                    if (e.response && e.response.status === 401) {
                        sessionStorage.removeItem('token');
                    }
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const registerUser = async (userData) => {
        try {
            // userData: { name, identifier (email), password }
            const response = await auth.register(userData.name, userData.identifier, userData.password);

            // Backend returns: { access_token, token_type }
            // We need to fetch user details or decode token.
            // Actually, my backend /auth/register returns Token.
            // Ideally, I should fetch /users/me or something. 
            // For now, let's store token and manual user object or assume success.
            // Wait, my API architecture had /auth/register return Token.
            // Let's decode token or just save it. 
            // Better: update backend to return User + Token? Or just Token.
            // Let's stick to Token.

            const { access_token } = response.data;
            sessionStorage.setItem('token', access_token);

            // Construct basic user object for UI (since backend didn't return full user)
            // Fetch real user details
            const profile = await users.getProfile();
            const user = profile.data;

            // Client-side fallback just in case
            if (!user.name) {
                user.name = user.email ? user.email.split('@')[0] : 'Member';
            }

            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    const loginUser = async (email, password) => {
        try {
            const response = await auth.login(email, password);
            const { access_token } = response.data;
            sessionStorage.setItem('token', access_token);

            // Fetch real user details
            const profile = await users.getProfile();
            const user = profile.data;

            // Client-side fallback just in case
            if (!user.name) {
                user.name = user.email ? user.email.split('@')[0] : 'Member';
            }

            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('photoApp_user');
        sessionStorage.removeItem('token');
    };

    const deleteAccount = async () => {
        try {
            await users.deleteAccount();
            setCurrentUser(null);
            sessionStorage.removeItem('photoApp_user');
            sessionStorage.removeItem('token');
        } catch (e) {
            console.error("Failed to delete account", e);
            throw e;
        }
    };

    const updateUserProfile = async (newUserData) => {
        try {
            // newUserData: { name, profile_pic_url }
            const response = await users.updateProfile(newUserData);
            const updatedUser = { ...currentUser, ...response.data };

            setCurrentUser(updatedUser);
            sessionStorage.setItem('photoApp_user', JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            console.error("Failed to update profile", error);
            throw error;
        }
    };

    const deletePhoto = async (photoId) => {
        try {
            // Delete from backend/GCS
            await media.delete(photoId);
            // Update local state
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error) {
            console.error("Failed to delete photo", error);
            throw error;
        }
    };

    const deletePhotos = async (photoIds) => {
        // Batch delete - call delete for each
        try {
            await Promise.all(photoIds.map(id => deletePhoto(id)));
            return true;
        } catch (error) {
            console.error("Batch delete failed", error);
            throw error;
        }
    };

    const toggleFavorite = async (photoId) => {
        // Optimistic update
        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
        ));

        try {
            // Find current state
            const photo = photos.find(p => p.id === photoId);
            if (photo) {
                // Update backend
                await media.toggleFavorite(photoId, !photo.isFavorite);
            }
        } catch (error) {
            console.error("Failed to toggle favorite", error);
            // Revert optimistic update
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
            ));
        }
    };

    const bulkToggleFavorite = async (photoIds, shouldFavorite) => {
        try {
            await Promise.all(photoIds.map(id => media.toggleFavorite(id, shouldFavorite)));

            // Update global state
            setPhotos(prev => prev.map(photo => {
                if (photoIds.includes(photo.id)) {
                    return { ...photo, isFavorite: shouldFavorite };
                }
                return photo;
            }));
            return true;
        } catch (error) {
            console.error("Failed to bulk toggle favorite", error);
            return false;
        }
    };

    const uploaders = useMemo(() => {
        return [...new Set(photos.map(p => p.uploader))];
    }, [photos]);

    const loadPhotos = async (collectionId) => {
        if (!collectionId) return;
        try {
            const response = await media.getByTrip(collectionId);
            // Handle Paginated Response (backend returns { items: [], ... })
            // If response.data is array (legacy/fallback), use it. If object with items, use items.
            const dataItems = Array.isArray(response.data) ? response.data : (response.data.items || []);

            // Map backend fields to frontend
            const loaded = dataItems.map(p => ({
                id: p.id,
                uploader: p.uploader_name || 'Fetched User',
                collectionId: p.trip_id,
                file: null, // No file object for fetched
                previewUrl: p.public_url,
                timestamp: p.created_at,
                description: '',
                name: 'photo',
                type: p.mime_type, // Vital for video support
                isFavorite: p.is_favorite
            }));

            // Merge or Replace? simplified: replace for this collection
            setPhotos(prev => {
                const others = prev.filter(p => p.collectionId !== collectionId);
                return [...others, ...loaded];
            });
        } catch (error) {
            console.error("Failed to load photos", error);
        }
    };

    const uploadPhoto = async (file, collectionId, onProgress) => {
        const timestamp = new Date().toISOString();
        let fileToProcess = file;

        // Check if HEIC
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
            try {
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });

                // Handle case where it returns an array of blobs
                const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                fileToProcess = new File(
                    [blob],
                    file.name.replace(/\.heic$/i, '.jpg'),
                    { type: 'image/jpeg' }
                );
            } catch (error) {
                console.error("HEIC conversion failed for", file.name, error);
            }
        }

        // Upload directly to GCS via backend
        try {
            const formData = new FormData();
            formData.append('file', fileToProcess);
            if (collectionId) {
                formData.append('trip_id', collectionId);
            }

            // We need to use raw Axios instance or modify api.upload to accept onUploadProgress
            // Since api.upload is a wrapper, we'll bypass it or modify it. 
            // Modifying api.upload in api.js is cleaner but let's see if we can just do it here temporarily or strictly.
            // Actually `media.upload` uses `api.post` which supports config.

            // Let's modify media.upload call signature here or in api.js?
            // api.js change is better, but I can't edit it in this tool call easily if I want to keep context locally.
            // Actually I can access `media.upload` source?
            // Let's do a direct call here for maximum control if needed, OR update api.js later.
            // Wait, I can pass a config object to `media.upload`?
            // Checking api.js: `upload: async (file, tripId = null) => { ... return api.post(...) }`
            // It doesn't accept config. I should update api.js first or use a workaround.
            // Workaround: I'll use `media.upload` but I need to update api.js to support progress.
            // Alternatively, I can just reimplement the axios call here using `api.post`.
            // Yes, let's use `api.post` directly here for valid progress tracking without touching api.js yet.
            // I need to import `api` instance? context imports `auth, media, users`. `media` uses `api` internally.
            // I don't have access to `api` instance directly exported from `../services/api` in this file unless I import it.
            // It imports `{ auth, media, users } from '../services/api'`.
            // I'll update api.js in a separate step or just assume I can update `media.upload` later.
            // FOR NOW: I will leave `uploadPhoto` calling `media.upload` but without progress, UNTIL I validly update api.js.
            // Wait, I am in logic flow. I should update api.js first. 
            // BUT I am forced to edit PhotoContext now.
            // I will write the code to assume `media.upload` takes a 3rd arg `onProgress`.

            const response = await media.upload(fileToProcess, collectionId, onProgress);
            const photoData = response.data;

            return {
                id: photoData.id,
                uploader: currentUser?.name || 'Unknown',
                collectionId: photoData.trip_id,
                file: fileToProcess,
                previewUrl: photoData.public_url,
                timestamp: photoData.created_at || timestamp,
                description: '',
                name: photoData.filename,
                size: photoData.size_bytes,
                type: photoData.mime_type,
                isFavorite: photoData.is_favorite
            };
        } catch (error) {
            console.error("Upload failed for", file.name, error);
            throw error;
        }
    };

    const addPhotos = async (uploaderName, newFiles, collectionId = null) => {
        // Wrapper for backward compatibility or bulk usage without progress UI
        const filesArray = Array.isArray(newFiles) ? newFiles : Array.from(newFiles);
        const allPhotos = [];

        for (const file of filesArray) {
            try {
                const photo = await uploadPhoto(file, collectionId);
                allPhotos.push(photo);
                setPhotos(prev => [...prev, photo]);
            } catch (e) {
                // Ignore individual failures in this bulk mode
            }
        }
        return allPhotos;
    };

    const getCollectionById = (id) => {
        // Deprecated: Use TripContext
        return null;
    };

    const getPhotosByCollection = (collectionId) => {
        return photos.filter(p => p.collectionId === collectionId);
    };

    const getPhotosByUploader = (uploaderName) => {
        return photos.filter(p => p.uploader === uploaderName);
    };

    const downloadPhoto = (photoId) => {
        media.download(photoId);
    };

    return (
        <PhotoContext.Provider value={{
            photos,
            uploaders,
            addPhotos,
            getPhotosByUploader,
            getPhotosByCollection,
            currentUser,
            registerUser,
            loginUser,
            logout,
            deleteAccount,
            updateUserProfile,
            deletePhoto,
            deletePhotos,
            toggleFavorite,
            bulkToggleFavorite,
            loadPhotos,
            downloadPhoto,
            uploadPhoto,
        }}>
            {children}
        </PhotoContext.Provider>
    );
};
