import React, { useState, useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import {
    Trash2, AlertTriangle, Check, ArrowLeft, LogOut, User, Save,
    Mail, Shield, Bell, Palette, Info, Moon, Sun, Eye, EyeOff,
    Camera, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { currentUser, logout, updateUserProfile, deleteAccount } = usePhotos();
    const navigate = useNavigate();

    // Profile State
    const [name, setName] = useState(currentUser?.name || '');
    const [isEditing, setIsEditing] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Preferences State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    const [showEmail, setShowEmail] = useState(false);

    // Danger Zone State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
        }
    }, [currentUser]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (name.trim()) {
            try {
                await updateUserProfile({ name: name.trim() });
                setIsEditing(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } catch (error) {
                console.error('Failed to update profile:', error);
            }
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        // You can implement actual theme switching here
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText === 'DELETE') {
            try {
                await deleteAccount();
                navigate('/login');
            } catch (error) {
                console.error('Failed to delete account:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-gray-900">Settings</h1>
                            <p className="text-xs text-gray-500">Manage your account and preferences</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-6 space-y-6">

                {/* Profile Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <User size={20} className="text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-start gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-lg">
                                    {currentUser?.name?.charAt(0).toUpperCase()}
                                </div>
                                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={14} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 w-full">
                                {isEditing ? (
                                    <form onSubmit={handleSaveProfile} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Display Name
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Enter your name"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={!name.trim()}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Save size={16} /> Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setName(currentUser?.name || '');
                                                }}
                                                className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 mb-1">{currentUser?.name}</h3>
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail size={14} />
                                                    <span className="text-sm">{currentUser?.email}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                Edit Profile
                                            </button>
                                        </div>
                                        {saveSuccess && (
                                            <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-4 py-2 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                                                <Check size={16} /> Profile updated successfully
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Palette size={20} className="text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                        {/* Theme */}
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    {theme === 'dark' ? <Moon size={20} className="text-gray-700 mt-0.5" /> : <Sun size={20} className="text-gray-700 mt-0.5" />}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Appearance</h3>
                                        <p className="text-sm text-gray-500">Choose your interface theme</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Sun size={16} className="inline mr-1" /> Light
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Moon size={16} className="inline mr-1" /> Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Privacy & Security */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Shield size={20} className="text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                        {/* Email Visibility */}
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    {showEmail ? <Eye size={20} className="text-gray-700 mt-0.5" /> : <EyeOff size={20} className="text-gray-700 mt-0.5" />}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Email Visibility</h3>
                                        <p className="text-sm text-gray-500">Show email in shared collections</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowEmail(!showEmail)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showEmail ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showEmail ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>

                        {/* Data Export */}
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <Download size={20} className="text-gray-700 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Export Data</h3>
                                        <p className="text-sm text-gray-500">Download all your photos and data</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Bell size={20} className="text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                        {/* Email Notifications */}
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <Mail size={20} className="text-gray-700 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Email Notifications</h3>
                                        <p className="text-sm text-gray-500">Receive updates via email</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEmailNotifications(!emailNotifications)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>

                        {/* Push Notifications */}
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <Bell size={20} className="text-gray-700 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Push Notifications</h3>
                                        <p className="text-sm text-gray-500">Get notified about new uploads</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPushNotifications(!pushNotifications)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Account Actions */}
                <section>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 text-gray-700 hover:text-black font-medium transition-colors w-full group"
                        >
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                                <LogOut size={18} />
                            </div>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </section>

                {/* Danger Zone */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} className="text-red-600" />
                        <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
                    </div>
                    <div className="bg-red-50 rounded-xl border border-red-200 p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 rounded-lg text-red-600 shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-900 mb-1">Delete Account</h3>
                                <p className="text-red-700/80 text-sm mb-4 leading-relaxed">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>

                                {showDeleteConfirm ? (
                                    <div className="space-y-3 bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                                        <p className="text-sm font-bold text-red-700 mb-2">
                                            Type <span className="font-mono bg-red-100 px-2 py-0.5 rounded">DELETE</span> to confirm
                                        </p>
                                        <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                            placeholder="Type DELETE"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleteConfirmText !== 'DELETE'}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Delete My Account
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setDeleteConfirmText('');
                                                }}
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <Trash2 size={16} /> Delete Account
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* App Info */}
                <section className="pt-4">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <Info size={14} />
                        <span>Centriq Suite v1.0.0</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
