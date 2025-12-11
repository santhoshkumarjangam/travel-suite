import React, { useState, useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';

const LoginPage = () => {
    const { currentUser, registerUser, loginUser } = usePhotos();
    const navigate = useNavigate();

    // Form State
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Controlled Inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // If already logged in, redirect to home
    useEffect(() => {
        if (currentUser) {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    // Clear error on mode switch or input
    useEffect(() => {
        setError('');
    }, [isLogin, name, email, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                // Login Flow
                if (!email.trim() || !password.trim()) {
                    throw new Error("Please enter both email and password.");
                }
                await loginUser(email, password);
                // Navigation happens in useEffect when currentUser updates
            } else {
                // Register Flow
                if (!name.trim() || !email.trim() || !password.trim()) {
                    throw new Error("All fields are required.");
                }
                await registerUser({ name, identifier: email, password });
            }
        } catch (err) {
            console.error("Auth Error:", err);
            let msg = "Authentication failed.";
            if (err.response) {
                // Backend Error
                msg = err.response.data?.detail || `Server Error: ${err.response.status}`;
            } else if (err.message) {
                // JS Error
                msg = err.message;
            }
            setError(msg);
            setIsLoading(false); // Only stop loading on error, success waits for redirect
        }
    };

    const getInputClass = (val) => {
        return `w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none ${val ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
            }`;
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

                {/* Main Form */}
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
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className={getInputClass(name)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                    className={getInputClass(email)}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={getInputClass(password)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
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
