import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePhotos } from '../context/PhotoContext';

const RequireAuth = ({ children }) => {
    const { currentUser, isLoading } = usePhotos();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!currentUser) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default RequireAuth;
