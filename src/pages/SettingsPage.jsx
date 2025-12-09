import React, { useState, useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { Trash2, AlertTriangle, Check, ArrowLeft, LogOut, User, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { currentUser, resetData, logout, updateUserProfile } = usePhotos();
    const navigate = useNavigate();

    // State
    const [name, setName] = useState(currentUser?.name || '');
    const [isEditing, setIsEditing] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
        }
    }, [currentUser]);

    const handleSaveProfile = (e) => {
        e.preventDefault();
        if (name.trim()) {
            updateUserProfile({ name: name.trim() });
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleReset = () => {
        resetData();
        setResetComplete(true);
        setShowDeleteConfirm(false);
        setTimeout(() => setResetComplete(false), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <span className="font-bold text-xl tracking-tight text-gray-900">Centriq Settings</span>
                </div>
            </header>

            <div className="max-w-2xl mx-auto p-6 space-y-8">

                {/* Profile Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile</h2>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start gap-6">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 shrink-0">
                                {currentUser?.name?.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 w-full">
                                {isEditing ? (
                                    <form onSubmit={handleSaveProfile} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Display Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={!name.trim()}
                                                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                            >
                                                <Save size={16} /> Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setName(currentUser?.name || '');
                                                }}
                                                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{currentUser?.name}</h3>
                                                <p className="text-gray-500">{currentUser?.identifier}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="text-sm text-blue-600 font-medium hover:underline"
                                            >
                                                Edit Profile
                                            </button>
                                        </div>
                                        {saveSuccess && (
                                            <div className="mt-2 flex items-center gap-2 text-green-600 text-sm font-medium">
                                                <Check size={16} /> Profile updated
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Logout Button */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-gray-600 hover:text-black font-medium transition-colors w-full"
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section>
                    <h2 className="text-lg font-semibold text-red-600 mb-3">Danger Zone</h2>
                    <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-900 mb-1">Reset Application</h3>
                                <p className="text-red-700/80 text-sm mb-4 leading-relaxed">
                                    This action will permanently delete all photos, albums, expense data, and local settings. The application will return to its initial setup state.
                                </p>

                                {resetComplete ? (
                                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                                        <Check size={18} /> Application has been reset.
                                    </div>
                                ) : (
                                    showDeleteConfirm ? (
                                        <div className="space-y-3 bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                            <p className="text-sm font-bold text-red-700">Are you absolutely sure?</p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleReset}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                                                >
                                                    Yes, Erase Everything
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
                                        >
                                            <Trash2 size={16} /> Delete All Data
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
