import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const value = {
        success: (message) => showToast(message, 'success'),
        error: (message) => showToast(message, 'error'),
        info: (message) => showToast(message, 'info'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                                toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                                    'bg-blue-50 border border-blue-200 text-blue-800'
                            }`}
                    >
                        {toast.type === 'success' && <CheckCircle size={20} className="shrink-0" />}
                        {toast.type === 'error' && <AlertCircle size={20} className="shrink-0" />}
                        {toast.type === 'info' && <Info size={20} className="shrink-0" />}

                        <p className="flex-1 text-sm font-medium">{toast.message}</p>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 hover:opacity-70 transition-opacity"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
