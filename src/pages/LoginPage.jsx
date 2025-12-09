import React, { useState, useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useNavigate } from 'react-router-dom';
import { Camera, Mail, Lock, User, Phone } from 'lucide-react';

const LoginPage = () => {
    const { currentUser, registerUser, loginUser } = usePhotos();
    const navigate = useNavigate();

    // Form State
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        identifier: '', // Email or Phone
        password: ''
    });

    // If already logged in, redirect to home
    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    // Auto-dismiss error
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const getInputClass = (val) => {
        return `w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none ${val ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
            }`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const { name, identifier, password } = formData;

        try {
            if (isLogin) {
                // Login Mode
                if (identifier.trim() && password.trim()) {
                    await loginUser(identifier, password);
                    navigate('/');
                }
            } else {
                // Sign Up Mode
                if (name.trim() && identifier.trim() && password.trim()) {
                    await registerUser({ name, identifier, password });
                    navigate('/');
                }
            }
        } catch (err) {
            console.error(err);
            // Extract error message from backend if available
            const msg = err.response?.data?.detail || "Authentication failed. Please check your credentials.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                {/* Logo / Branding */}
                <div className="flex flex-col items-center text-center">
                    <img
                        src="/centriq-logo.png"
                        alt="Centriq Logo"
                        className="w-20 h-20 rounded-2xl object-cover shadow-xl mb-6"
                    />
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {isLogin ? 'Welcome' : 'Create Account'}
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        {isLogin ? 'Enter your details to access your photos.' : 'Your memories, organized beautifully.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xl shadow-gray-100/50">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Name Field (Only in Sign Up) */}
                        {!isLogin && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Jane Doe"
                                        className={getInputClass(formData.name)}
                                        autoFocus={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email/Phone Field */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider ml-1">Email or Phone</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={formData.identifier}
                                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                    placeholder="jane@example.com"
                                    className={getInputClass(formData.identifier)}
                                    autoFocus={isLogin}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className={getInputClass(formData.password)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || (!isLogin && !formData.name) || !formData.identifier || !formData.password}
                            className="btn-primary w-full py-4 text-lg justify-center shadow-lg shadow-black/5 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                isLogin ? 'Log In' : 'Get Started'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-gray-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-black font-semibold cursor-pointer hover:underline focus:outline-none"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
