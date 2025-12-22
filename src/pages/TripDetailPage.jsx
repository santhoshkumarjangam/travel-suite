import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import {
    ArrowLeft, Plus, Calendar, MapPin, DollarSign, Clock,
    Utensils, Camera, Car, Hotel, ShoppingBag, Music,
    Edit2, Trash2, X, Copy, CheckCircle, AlertCircle, Upload, ImageIcon, Check
} from 'lucide-react';
import { itinerary } from '../services/itineraryApi';

const TripDetailPage = () => {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { currentTrip, days, activities, loadTrip, addDay, addActivity, updateActivity, deleteActivity, deleteDay, deleteTrip } = useItinerary();
    const [selectedDay, setSelectedDay] = useState(null);
    const [showAddDayModal, setShowAddDayModal] = useState(false);
    const [showAddActivityModal, setShowAddActivityModal] = useState(false);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
    const [dayToDelete, setDayToDelete] = useState(null);
    const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState(null);
    const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);

    useEffect(() => {
        if (tripId) {
            loadTrip(tripId);
        }
    }, [tripId]);

    useEffect(() => {
        if (days.length > 0 && !selectedDay) {
            setSelectedDay(days[0]);
        }
    }, [days]);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(currentTrip.join_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleEditActivity = (activity) => {
        setEditingActivity(activity);
        setShowEditActivityModal(true);
    };

    const confirmDeleteDay = (day) => {
        setDayToDelete(day);
        setShowDeleteDayModal(true);
    };

    const handleDeleteDay = async () => {
        if (dayToDelete) {
            await deleteDay(dayToDelete.id);
            if (selectedDay?.id === dayToDelete.id) {
                setSelectedDay(days[0]);
            }
            setShowDeleteDayModal(false);
            setDayToDelete(null);
        }
    };

    const confirmDeleteActivity = (activity) => {
        setActivityToDelete(activity);
        setShowDeleteActivityModal(true);
    };

    const handleDeleteActivity = async () => {
        if (activityToDelete) {
            await deleteActivity(activityToDelete.id, selectedDay.id);
            setShowDeleteActivityModal(false);
            setActivityToDelete(null);
        }
    };

    const handleDeleteTrip = async () => {
        await deleteTrip(tripId);
        navigate('/itinerary');
    };

    if (!currentTrip) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    const dayActivities = selectedDay ? (activities[selectedDay.id] || []) : [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/itinerary')}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Trips</span>
                </button>
                <button
                    onClick={() => setShowDeleteTripModal(true)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5"
                >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Delete Trip</span>
                </button>
            </div>

            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{currentTrip.name}</h1>
                        {currentTrip.destination && (
                            <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <MapPin size={16} className="flex-shrink-0" />
                                <span className="text-sm sm:text-base truncate">{currentTrip.destination}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Join Code</div>
                            <code className="text-base sm:text-lg font-mono font-semibold text-teal-600">
                                {currentTrip.join_code}
                            </code>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Copy code"
                        >
                            {copiedCode ? (
                                <CheckCircle size={18} className="text-green-600" />
                            ) : (
                                <Copy size={18} className="text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Days Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h2 className="font-semibold text-gray-900">Days</h2>
                            <button
                                onClick={() => setShowAddDayModal(true)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Plus size={18} className="text-teal-600" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 lg:space-y-2 lg:grid-cols-1 max-h-[300px] lg:max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide">
                            {days.map(day => (
                                <DayCard
                                    key={day.id}
                                    day={day}
                                    isSelected={selectedDay?.id === day.id}
                                    onClick={() => setSelectedDay(day)}
                                    onDelete={() => confirmDeleteDay(day)}
                                    activityCount={activities[day.id]?.length || 0}
                                />
                            ))}

                            {days.length === 0 && (
                                <div className="text-center py-6 sm:py-8 text-gray-400 text-sm col-span-3 lg:col-span-1">
                                    <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                                    <p>No days added yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activities Main Area */}
                <div className="lg:col-span-3">
                    {selectedDay ? (
                        <div className="bg-white border border-gray-200 rounded-lg">
                            <div className="p-3 sm:p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                            {selectedDay.title || `Day ${selectedDay.day_number}`}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-gray-500">
                                            {new Date(selectedDay.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddActivityModal(true)}
                                        className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        <span className="hidden sm:inline">Add Activity</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 space-y-3 max-h-[calc(100vh-500px)] min-h-[200px] lg:max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
                                {dayActivities.map(activity => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onEdit={() => handleEditActivity(activity)}
                                        onDelete={() => confirmDeleteActivity(activity)}
                                        onPhotoUpdate={() => loadTrip(tripId)}
                                    />
                                ))}

                                {dayActivities.length === 0 && (
                                    <div className="text-center py-8 sm:py-12 text-gray-400">
                                        <Calendar size={36} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No activities planned for this day</p>
                                        <button
                                            onClick={() => setShowAddActivityModal(true)}
                                            className="mt-4 text-teal-600 text-sm font-medium hover:text-teal-700"
                                        >
                                            Add your first activity
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
                            <Calendar size={40} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No day selected</h3>
                            <p className="text-sm text-gray-500 mb-6">Add a day to start planning your itinerary</p>
                            <button
                                onClick={() => setShowAddDayModal(true)}
                                className="px-4 sm:px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add Day
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddDayModal && (
                <AddDayModal
                    tripId={tripId}
                    dayNumber={days.length + 1}
                    onClose={() => setShowAddDayModal(false)}
                    onAdd={addDay}
                />
            )}

            {showAddActivityModal && selectedDay && (
                <AddActivityModal
                    dayId={selectedDay.id}
                    activityCount={dayActivities.length}
                    onClose={() => setShowAddActivityModal(false)}
                    onAdd={addActivity}
                />
            )}

            {showEditActivityModal && editingActivity && (
                <EditActivityModal
                    activity={editingActivity}
                    onClose={() => {
                        setShowEditActivityModal(false);
                        setEditingActivity(null);
                    }}
                    onUpdate={updateActivity}
                    onPhotoUpdate={() => loadTrip(tripId)}
                />
            )}

            {showDeleteDayModal && (
                <ConfirmModal
                    title="Delete Day"
                    message={`Delete "${dayToDelete?.title || `Day ${dayToDelete?.day_number}`}" and all its activities?`}
                    confirmText="Delete Day"
                    onConfirm={handleDeleteDay}
                    onCancel={() => {
                        setShowDeleteDayModal(false);
                        setDayToDelete(null);
                    }}
                />
            )}

            {showDeleteActivityModal && (
                <ConfirmModal
                    title="Delete Activity"
                    message={`Delete "${activityToDelete?.title}"?`}
                    confirmText="Delete Activity"
                    onConfirm={handleDeleteActivity}
                    onCancel={() => {
                        setShowDeleteActivityModal(false);
                        setActivityToDelete(null);
                    }}
                />
            )}

            {showDeleteTripModal && (
                <ConfirmModal
                    title="Delete Trip"
                    message={`Delete "${currentTrip.name}" and all its data? This cannot be undone.`}
                    confirmText="Delete Trip"
                    onConfirm={handleDeleteTrip}
                    onCancel={() => setShowDeleteTripModal(false)}
                    danger
                />
            )}
        </div>
    );
};

// Confirmation Modal Component
const ConfirmModal = ({ title, message, confirmText, onConfirm, onCancel, danger = false }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        <AlertCircle size={24} className={danger ? 'text-red-600' : 'text-yellow-600'} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
                        <p className="text-sm text-gray-600">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${danger
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Day Card Component - Green highlight, no checkmark
const DayCard = ({ day, isSelected, onClick, onDelete, activityCount }) => {
    return (
        <div
            className={`relative group w-full text-left p-3 rounded-lg transition-all ${isSelected
                ? 'bg-green-50 border-2 border-green-500'
                : 'border-2 border-transparent hover:bg-gray-50'
                }`}
        >
            <button onClick={onClick} className="w-full text-left">
                <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm sm:text-base ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>
                        {day.title || `Day ${day.day_number}`}
                    </span>
                </div>
                <div className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                </div>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-lg transition-all"
                title="Delete day"
            >
                <Trash2 size={14} className="text-red-600" />
            </button>
        </div>
    );
};

// Activity Card Component with Photo
const ActivityCard = ({ activity, onEdit, onDelete, onPhotoUpdate }) => {
    const icon = getActivityIcon(activity.activity_type);
    const itinerary = useItinerary();

    const handleToggleComplete = async (e) => {
        e.stopPropagation();
        try {
            await itinerary.updateActivity(activity.id, {
                is_completed: !activity.is_completed
            });
        } catch (error) {
            console.error('Failed to toggle completion', error);
        }
    };

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-all group ${activity.is_completed ? 'opacity-60 bg-gray-50' : ''
            }`}>
            {/* Photo */}
            {activity.image_url && (
                <div className="relative h-48 bg-gray-100">
                    <img
                        src={activity.image_url}
                        alt={activity.title}
                        className="w-full h-full object-cover"
                    />
                    {activity.is_completed && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-3">
                                <Check size={32} className="text-white" strokeWidth={3} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <button
                        onClick={handleToggleComplete}
                        className={`flex-shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${activity.is_completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                            }`}
                        title={activity.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                        {activity.is_completed && (
                            <Check size={14} className="text-white" strokeWidth={3} />
                        )}
                    </button>

                    <div className={`p-2 rounded-lg flex-shrink-0 ${getActivityColor(activity.activity_type)}`}>
                        {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={`font-medium mb-1 text-sm sm:text-base ${activity.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}>
                            {activity.title}
                        </h3>

                        {activity.description && (
                            <p className={`text-xs sm:text-sm mb-2 ${activity.is_completed ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                {activity.description}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-gray-500">
                            {activity.start_time && (
                                <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{activity.start_time}</span>
                                </div>
                            )}
                            {activity.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{activity.location}</span>
                                    {activity.maps_link && (
                                        <a
                                            href={activity.maps_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-1 text-teal-600 hover:text-teal-700 transition-colors"
                                            title="Open in Google Maps"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            )}
                            {activity.cost && (
                                <div className="flex items-center gap-1">
                                    <DollarSign size={12} />
                                    <span>{activity.cost} {activity.currency}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                            onClick={onEdit}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit activity"
                        >
                            <Edit2 size={16} className="text-blue-600" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete activity"
                        >
                            <Trash2 size={16} className="text-red-600" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper functions
const getActivityIcon = (type) => {
    const iconProps = { size: 18, className: "text-white" };
    switch (type) {
        case 'food': return <Utensils {...iconProps} />;
        case 'sightseeing': return <Camera {...iconProps} />;
        case 'transport': return <Car {...iconProps} />;
        case 'accommodation': return <Hotel {...iconProps} />;
        case 'shopping': return <ShoppingBag {...iconProps} />;
        case 'entertainment': return <Music {...iconProps} />;
        default: return <Calendar {...iconProps} />;
    }
};

const getActivityColor = (type) => {
    switch (type) {
        case 'food': return 'bg-orange-500';
        case 'sightseeing': return 'bg-blue-500';
        case 'transport': return 'bg-gray-500';
        case 'accommodation': return 'bg-purple-500';
        case 'shopping': return 'bg-pink-500';
        case 'entertainment': return 'bg-red-500';
        default: return 'bg-teal-500';
    }
};

// Add Day Modal
const AddDayModal = ({ tripId, dayNumber, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        day_number: dayNumber,
        date: '',
        title: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd(tripId, formData);
            onClose();
        } catch (error) {
            console.error('Failed to add day', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add Day</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Day Number</label>
                        <input
                            type="number"
                            required
                            value={formData.day_number}
                            onChange={(e) => setFormData({ ...formData, day_number: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                        <input
                            type="text"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                            placeholder="e.g., Exploring Paris"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            {loading ? 'Adding...' : 'Add Day'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Add Activity Modal
const AddActivityModal = ({ dayId, activityCount, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        activity_type: 'sightseeing',
        start_time: '',
        location: '',
        cost: '',
        currency: 'USD',
        order_index: activityCount
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Normalize time format (9:30 -> 09:30)
            const normalizeTime = (timeStr) => {
                if (!timeStr) return null;  // Return null instead of empty string
                const parts = timeStr.split(':');
                if (parts.length === 2) {
                    const hours = parts[0].padStart(2, '0');
                    const minutes = parts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                }
                return timeStr;
            };

            const dataToSubmit = {
                ...formData,
                start_time: normalizeTime(formData.start_time),
                description: formData.description || null,
                location: formData.location || null,
                maps_link: formData.maps_link || null,
                cost: formData.cost ? parseFloat(formData.cost) : null
            };
            await onAdd(dayId, dataToSubmit);

            onClose();
        } catch (error) {
            console.error('Failed to add activity', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-lg p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add Activity</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                            placeholder="e.g., Visit Eiffel Tower"
                        />
                    </div>


                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                            type="text"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            placeholder="09:30"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs sm:text-sm shadow-sm hover:border-gray-400 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                            placeholder="e.g., Champ de Mars, Paris"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link (optional)</label>
                        <input
                            type="url"
                            value={formData.maps_link || ''}
                            onChange={(e) => setFormData({ ...formData, maps_link: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                            placeholder="https://maps.google.com/..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm sm:text-base"
                            placeholder="Add notes or details..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            {loading ? 'Adding...' : 'Add Activity'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};

// Edit Activity Modal with Photo Upload
const EditActivityModal = ({ activity, onClose, onUpdate, onPhotoUpdate }) => {
    const [formData, setFormData] = useState({
        title: activity.title || '',
        description: activity.description || '',
        activity_type: activity.activity_type || 'sightseeing',
        start_time: activity.start_time || '',
        location: activity.location || '',
        maps_link: activity.maps_link || '',
        cost: activity.cost || '',
        currency: activity.currency || 'USD',
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Normalize time format (9:30 -> 09:30)
            const normalizeTime = (timeStr) => {
                if (!timeStr) return null;  // Return null instead of empty string
                const parts = timeStr.split(':');
                if (parts.length === 2) {
                    const hours = parts[0].padStart(2, '0');
                    const minutes = parts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                }
                return timeStr;
            };

            const dataToSubmit = {
                ...formData,
                start_time: normalizeTime(formData.start_time),
                description: formData.description || null,
                location: formData.location || null,
                maps_link: formData.maps_link || null,
                cost: formData.cost ? parseFloat(formData.cost) : null
            };
            await onUpdate(activity.id, dataToSubmit);
            onClose();
        } catch (error) {
            console.error('Failed to update activity', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            await itinerary.uploadActivityPhoto(activity.id, file);
            onPhotoUpdate();
        } catch (error) {
            console.error('Failed to upload photo', error);
            alert('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-lg p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Activity</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Photo Upload Section */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity Photo</label>
                    {activity.image_url ? (
                        <div className="relative">
                            <img
                                src={activity.image_url}
                                alt={activity.title}
                                className="w-full h-48 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        <span>Change Photo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-teal-600"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                    <span className="text-sm">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={32} />
                                    <span className="text-sm font-medium">Click to upload photo</span>
                                </>
                            )}
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                    />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                        />
                    </div>


                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                            type="text"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            placeholder="09:30"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs sm:text-sm shadow-sm hover:border-gray-400 transition-colors"
                        />
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link (optional)</label>
                        <input
                            type="url"
                            value={formData.maps_link || ''}
                            onChange={(e) => setFormData({ ...formData, maps_link: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                            placeholder="https://maps.google.com/..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm sm:text-base"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default TripDetailPage;
