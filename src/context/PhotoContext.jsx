import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import heic2any from 'heic2any';
import { auth, media, users } from '../services/api';

const PhotoContext = createContext();

export const usePhotos = () => useContext(PhotoContext);

export const PhotoProvider = ({ children }) => {
    // Photos array: { id, uploader, file, previewUrl, timestamp, description, collectionId, isFavorite }
    const [photos, setPhotos] = useState([]);

    // User Identity
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = sessionStorage.getItem('photoApp_user');
        return saved ? JSON.parse(saved) : null;
    });

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
            const user = {
                id: 'sub-from-token', // TODO: Decode JWT
                name: userData.name,
                email: userData.identifier
            };

            setCurrentUser(user);
            sessionStorage.setItem('photoApp_user', JSON.stringify(user));
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

            // Store basic dummy user for now until we have /users/me
            const user = {
                id: 'logged-in-user',
                name: email.split('@')[0],
                email: email
            };
            setCurrentUser(user);
            sessionStorage.setItem('photoApp_user', JSON.stringify(user));
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

    const deletePhoto = (photoId) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    };

    const deletePhotos = (photoIds) => {
        setPhotos(prev => prev.filter(p => !photoIds.includes(p.id)));
    };

    const toggleFavorite = (photoId) => {
        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
        ));
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

        // Ensure newFiles is an array (safely handle FileList)
        const filesArray = Array.isArray(newFiles) ? newFiles : Array.from(newFiles);

        const processedFilesPromises = filesArray.map(async (file) => {
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

            // Upload to Backend/GCS
            try {
                // 1. Get Upload URL
                const response = await media.getUploadUrl(
                    fileToProcess.name,
                    fileToProcess.type,
                    fileToProcess.size,
                    collectionId
                );

                const { upload_url, public_url, photo_id } = response.data;

                // 2. Upload File to GCS
                await media.uploadFile(upload_url, fileToProcess);

                // 3. Return Photo Object (Optimistic + Real URL)
                return {
                    id: photo_id,
                    uploader: uploaderName,
                    collectionId,
                    file: fileToProcess,
                    previewUrl: public_url,
                    timestamp: timestamp,
                    description: '',
                    name: fileToProcess.name,
                    size: fileToProcess.size,
                    type: fileToProcess.type,
                    isFavorite: false
                };
            } catch (error) {
                console.error("Upload failed for", file.name, error);
                return null; // Skip failed uploads
            }
        });

        const newPhotos = (await Promise.all(processedFilesPromises)).filter(p => p !== null);
        setPhotos(prev => [...prev, ...newPhotos]);

        // Note: Trip cover photo updating is now handled by usage, or could be exposed in TripContext if needed.
        // For now, we just add the photos.
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
        }}>
            {children}
        </PhotoContext.Provider>
    );
};
