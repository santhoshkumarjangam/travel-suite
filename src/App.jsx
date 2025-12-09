import { Routes, Route } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import { PhotoProvider } from './context/PhotoContext';
import { ExpenseProvider } from './context/ExpenseContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import UploadPage from './pages/UploadPage';
import GalleryPage from './pages/GalleryPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailsPage from './pages/CollectionDetailsPage';
import FavoritesPage from './pages/FavoritesPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import HubPage from './pages/HubPage';
import ExpenseTracker from './pages/ExpenseTracker';

function App() {
  return (
    <PhotoProvider>
      <TripProvider>
        <ExpenseProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Hub Route */}
            <Route path="/" element={
              <RequireAuth>
                <HubPage />
              </RequireAuth>
            } />

            {/* Galleriq Routes */}
            <Route path="/galleriq" element={
              <RequireAuth>
                <Layout>
                  <UploadPage />
                </Layout>
              </RequireAuth>
            } />

            <Route path="/galleriq/gallery" element={
              <RequireAuth>
                <Layout>
                  <GalleryPage />
                </Layout>
              </RequireAuth>
            } />

            <Route path="/galleriq/collections" element={
              <RequireAuth>
                <Layout>
                  <CollectionsPage />
                </Layout>
              </RequireAuth>
            } />

            <Route path="/galleriq/collections/:id" element={
              <RequireAuth>
                <Layout>
                  <CollectionDetailsPage />
                </Layout>
              </RequireAuth>
            } />

            <Route path="/galleriq/favorites" element={
              <RequireAuth>
                <Layout>
                  <FavoritesPage />
                </Layout>
              </RequireAuth>
            } />



            {/* Global Settings */}
            <Route path="/settings" element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            } />

            {/* Expense Tracker Route */}
            <Route path="/economiq" element={
              <RequireAuth>
                <ExpenseTracker />
              </RequireAuth>
            } />
          </Routes>
        </ExpenseProvider>
      </TripProvider>
    </PhotoProvider>
  );
}

export default App;
