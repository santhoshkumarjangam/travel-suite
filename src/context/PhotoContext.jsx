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

    const deletePhotos = (photoIds) => {
        // Batch delete - call delete for each
        Promise.all(photoIds.map(id => deletePhoto(id)))
            .catch(error => console.error("Batch delete failed", error));
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

    const bulkToggleFavorite = (photoIds, shouldFavorite) => {
        setPhotos(prev => prev.map(photo => {
            if (photoIds.includes(photo.id)) {
                return { ...photo, isFavorite: shouldFavorite };
            }
            return photo;
        }));
    };

    const uploaders = useMemo(() => {
        return [...new Set(photos.map(p => p.uploader))];
    }, [photos]);

    const loadPhotos = async (collectionId) => {
        if (!collectionId) return;
        try {
            const response = await media.getByTrip(collectionId);
            // Map backend fields to frontend
            const loaded = response.data.map(p => ({
                id: p.id,
                uploader: 'Fetched User', // TODO: Resolve name from ID if needed
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

    const addPhotos = async (uploaderName, newFiles, collectionId = null) => {
        const timestamp = new Date().toISOString();
        const BATCH_SIZE = 5; // Upload 5 files at a time for optimal performance

        // Ensure newFiles is an array (safely handle FileList)
        const filesArray = Array.isArray(newFiles) ? newFiles : Array.from(newFiles);

        // Helper function to process a single file
        const processFile = async (file) => {
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
                const response = await media.upload(fileToProcess, collectionId);
                const photoData = response.data;

                // Return photo object with GCS data
                return {
                    id: photoData.id,
                    uploader: uploaderName,
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
                return null; // Skip failed uploads
            }
        };

        // Process files in batches for parallel uploads
        const allPhotos = [];
        for (let i = 0; i < filesArray.length; i += BATCH_SIZE) {
            const batch = filesArray.slice(i, i + BATCH_SIZE);
            console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(filesArray.length / BATCH_SIZE)} (${batch.length} files)`);

            // Process batch in parallel
            const batchResults = await Promise.all(batch.map(processFile));
            const successfulUploads = batchResults.filter(p => p !== null);

            // Add successful uploads to state immediately (progressive loading)
            if (successfulUploads.length > 0) {
                setPhotos(prev => [...prev, ...successfulUploads]);
                allPhotos.push(...successfulUploads);
            }
        }

        console.log(`✅ Upload complete: ${allPhotos.length}/${filesArray.length} files uploaded successfully`);
        return allPhotos; // Return all uploaded photos
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
        }}>
            {children}
        </PhotoContext.Provider>
    );
};
