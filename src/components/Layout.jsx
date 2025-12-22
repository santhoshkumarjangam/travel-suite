import React from 'react';
import { NavLink } from 'react-router-dom';
import { Upload, Image as GalleryIcon, Folder, Home, Heart } from 'lucide-react';

import { usePhotos } from '../context/PhotoContext';

const Layout = ({ children }) => {
    const { currentUser } = usePhotos();
    const navItems = [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Upload', path: '/galleriq', icon: Upload },
        { label: 'Favorites', path: '/galleriq/favorites', icon: Heart },
        { label: 'Collections', path: '/galleriq/collections', icon: Folder },
    ];

    return (
        <div className="layout-grid font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="sidebar flex flex-col p-6">
                <div className="mb-10 flex items-center gap-3 px-2">
                    <img src="/galleriq-logo.png" alt="Galleriq Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                    <span className="font-bold text-xl tracking-tight">Galleriq</span>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.filter(item => item.path !== "/").map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/galleriq'}
                            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                                    ? 'bg-black/5 text-black'
                                    : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}
              `}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-200">
                    <NavLink
                        to="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 mb-2"
                        title="Back to Apps"
                    >
                        <div className="w-4 h-4 rounded bg-gray-300 grid grid-cols-2 gap-0.5 p-0.5">
                            <div className="bg-white rounded-[1px]"></div>
                            <div className="bg-white rounded-[1px]"></div>
                            <div className="bg-white rounded-[1px]"></div>
                            <div className="bg-white rounded-[1px]"></div>
                        </div>
                        All Apps
                    </NavLink>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{currentUser?.name}</span>
                            <span className="text-xs text-gray-500">Free Member</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-around items-center p-3 md:hidden z-50 pb-safe">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/galleriq'}
                        className={({ isActive }) => `
                flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
                ${isActive
                                ? 'text-black'
                                : 'text-gray-400'}
              `}
                    >
                        <item.icon size={20} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default Layout;




