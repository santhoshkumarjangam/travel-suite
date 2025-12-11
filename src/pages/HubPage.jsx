import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CreditCard, ArrowRight, User, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import { usePhotos } from '../context/PhotoContext';

const HubPage = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = usePhotos();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsUserMenuOpen(false);
    };

    const apps = [
        {
            id: 'galleriq',
            name: 'Galleriq',
            description: 'Your premium photo gallery & shared albums.',
            icon: Camera,
            path: '/galleriq',
            color: 'bg-blue-600',
            gradient: 'from-blue-500 to-cyan-500',
            logo: '/galleriq-logo.png'
        },
        {
            id: 'expenses',
            name: 'Economiq',
            description: 'Track spending, manage budgets & save more.',
            icon: CreditCard,
            path: '/economiq',
            color: 'bg-emerald-600',
            gradient: 'from-emerald-500 to-teal-500',
            logo: '/economiq-logo.png'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/centriq-logo.png" alt="Centriq" className="w-10 h-10 rounded-xl shadow-sm object-cover" />
                        <span className="font-bold text-xl tracking-tight text-gray-900">Centriq</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Global Settings"
                        >
                            <SettingsIcon size={20} />
                        </button>

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-gray-900">{currentUser?.name}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                                        <p className="text-xs text-gray-500">{currentUser?.email}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back, {currentUser?.name}</h1>
                    <p className="text-gray-500 text-lg">Your digital suite.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {apps.map((app) => (
                        <div
                            key={app.id}
                            onClick={() => navigate(app.path)}
                            className="group bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${app.gradient} opacity-5 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500`} />

                            <div className="flex items-start justify-between mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${app.color} ${app.gradient} bg-gradient-to-br`}>
                                    {app.logo ? (
                                        <img src={app.logo} alt={app.name} className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <app.icon size={32} />
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                                    <ArrowRight size={20} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{app.name}</h2>
                            <p className="text-gray-500 leading-relaxed">{app.description}</p>
                        </div>
                    ))}


                </div>
            </main>
        </div>
    );
};

export default HubPage;

