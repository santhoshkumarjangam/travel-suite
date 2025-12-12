import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import {
    Plus, Calendar, MapPin, Users, Share2, Trash2,
    ChevronRight, Plane, Search, LogIn, Home
} from 'lucide-react';

const ItineraryPage = () => {
    const navigate = useNavigate();
    const { trips, loading, createTrip, joinTrip, deleteTrip } = useItinerary();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter trips
    const filteredTrips = trips.filter(trip =>
        trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Navigation */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/')}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
                >
                    <Home size={16} />
                    <span>Back to Home</span>
                </button>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                        Trip Itineraries
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Plan your adventures day by day
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn size={16} />
                        <span className="text-xs sm:text-sm">Join Trip</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        <span className="text-xs sm:text-sm">New Trip</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search trips..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Trips Grid */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading trips...</p>
                </div>
            ) : filteredTrips.length === 0 ? (
                <div className="text-center py-20">
                    <Plane className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
                    <p className="text-gray-500 mb-6">Create your first trip itinerary or join an existing one</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Trip
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onClick={() => navigate(`/itinerary/${trip.id}`)}
                            onDelete={deleteTrip}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateTripModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createTrip}
                />
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <JoinTripModal
                    onClose={() => setShowJoinModal(false)}
                    onJoin={joinTrip}
                />
            )}
        </div>
    );
};

// Trip Card Component
const TripCard = ({ trip, onClick, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);

    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    return (
        <div
            onClick={onClick}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer group"
        >
            {/* Cover Image */}
            <div className="h-40 bg-gradient-to-br from-teal-400 to-teal-600 relative">
                {trip.cover_image_url ? (
                    <img src={trip.cover_image_url} alt={trip.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Plane className="text-white/30" size={48} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{trip.name}</h3>

                {trip.destination && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                        <MapPin size={14} />
                        <span className="truncate">{trip.destination}</span>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{trip.members?.length || 0}</span>
                    </div>
                </div>

                {/* Join Code */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Share2 size={14} className="text-gray-400" />
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {trip.join_code}
                        </code>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-teal-600 transition-colors" />
                </div>
            </div>
        </div>
    );
};

// Create Trip Modal
const CreateTripModal = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '',
        destination: '',
        start_date: '',
        end_date: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onCreate(formData);
            onClose();
        } catch (error) {
            console.error('Failed to create trip', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Trip</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trip Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., Summer Europe Trip"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Destination
                        </label>
                        <input
                            type="text"
                            value={formData.destination}
                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., Paris, France"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                placeholder="2025-12-27"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                placeholder="2025-12-31"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                            placeholder="Brief description of your trip..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Trip'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Join Trip Modal
const JoinTripModal = ({ onClose, onJoin }) => {
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await onJoin(joinCode.toUpperCase());
            onClose();
        } catch (error) {
            setError('Invalid join code or trip not found');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Join Trip</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Join Code
                        </label>
                        <input
                            type="text"
                            required
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-center text-lg tracking-wider"
                            placeholder="ABC123"
                            maxLength={6}
                        />
                        {error && (
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || joinCode.length !== 6}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Joining...' : 'Join'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ItineraryPage;
