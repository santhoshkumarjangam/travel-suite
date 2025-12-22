import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePhotos } from '../context/PhotoContext';
import { media } from '../services/api';
import { useTrips } from '../context/TripContext';
import { useToast } from '../context/ToastContext';
import Lightbox from '../components/Lightbox';
import { ArrowLeft, Copy, Check, Upload, Image as ImageIcon, Plus, Trash2, Download, X, Square, CheckSquare, Heart, Play, Loader2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const CollectionDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPhotosByCollection, addPhotos, uploadPhoto, deletePhotos, toggleFavorite, bulkToggleFavorite, currentUser } = usePhotos();
    const { getTrip, deleteTrip } = useTrips();
    const toast = useToast();

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [isLimitOpen, setIsLimitOpen] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [localPhotos, setLocalPhotos] = useState([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

    const loadPaginatedPhotos = React.useCallback(async () => {
        if (!id) return;
        setIsLoadingPhotos(true);
        try {
            const response = await media.getByTrip(id, page, limit);
            const { items, total, pages } = response.data;
            setLocalPhotos(items.map(p => ({
                id: p.id,
                uploader: p.uploader_name || 'Fetched User',
                collectionId: p.trip_id,
                file: null,
                previewUrl: p.public_url,
                timestamp: p.created_at,
                description: '',
                name: p.filename,
                type: p.mime_type,
                isFavorite: p.is_favorite
            })));
            setTotalItems(total);
            setTotalPages(pages);
        } catch (error) {
            console.error("Failed to load paginated photos", error);
            toast.error("Failed to load photos");
        } finally {
            setIsLoadingPhotos(false);
        }
    }, [id, page, limit, toast]);

    React.useEffect(() => {
        loadPaginatedPhotos();
    }, [loadPaginatedPhotos]);

    const collection = getTrip(id);
    const photos = localPhotos; // Use local paginated photos instead of Context photos
    const deleteCollection = deleteTrip;

    const [activeFilter, setActiveFilter] = useState('All');
    const [copied, setCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);

    const fileInputRef = useRef(null);

    const handleDeleteCollection = () => {
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (collection) {
            setIsDeleting(true);
            try {
                const result = await deleteCollection(collection.id);
                if (result.success) {
                    toast.success("Collection deleted successfully");
                    navigate('/galleriq/collections');
                } else {
                    toast.error(result.message);
                }
            } catch (error) {
                console.error("Delete failed", error);
                if (error.response && error.response.status === 403) {
                    toast.error("You can only delete collections that you created.");
                } else {
                    toast.error("Failed to delete collection");
                }
            } finally {
                setIsDeleting(false);
                setDeleteModalOpen(false);
            }
        }
    };

    const handleToggleFavorite = async (photoId, e) => {
        if (e) e.stopPropagation();

        const photo = localPhotos.find(p => p.id === photoId);
        if (!photo) return;

        const newStatus = !photo.isFavorite;

        // Optimistic update
        setLocalPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, isFavorite: newStatus } : p
        ));

        try {
            // Call API directly since we manage state locally
            await media.toggleFavorite(photoId, newStatus);
        } catch (error) {
            console.error("Failed to toggle favorite", error);
            // Revert on failure
            setLocalPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, isFavorite: !newStatus } : p
            ));
            toast.error("Failed to update favorite status");
        }
    };

    const toggleSelection = (photoId) => {
        setSelectedIds(prev => {
            if (prev.includes(photoId)) {
                const newSelection = prev.filter(id => id !== photoId);
                if (newSelection.length === 0) setIsSelectionMode(false);
                return newSelection;
            } else {
                setIsSelectionMode(true);
                return [...prev, photoId];
            }
        });
    };

    const selectAll = () => {
        if (selectedIds.length === filteredPhotos.length) {
            setSelectedIds([]);
            setIsSelectionMode(false);
        } else {
            setSelectedIds(filteredPhotos.map(p => p.id));
            setIsSelectionMode(true);
        }
    };

    const handleBulkDownload = async () => {
        const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

        // Download individually with delay to prevent browser blocking
        for (const photo of selectedPhotos) {
            try {
                // Fetch blob from backend proxy to avoid CORS
                const response = await fetch(media.getDownloadUrl(photo.id), {
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = photo.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                // Small delay to be nice to the browser
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error("Failed to download photo", photo.name, error);
            }
        }

        setSelectedIds([]);
        setIsSelectionMode(false);
    };

    const confirmBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await deletePhotos(selectedIds);
            await loadPaginatedPhotos(); // Refresh data to fill page
            toast.success(`Deleted ${selectedIds.length} photos successfully`);
            setSelectedIds([]);
            setIsSelectionMode(false);
        } catch (error) {
            console.error("Bulk delete failed", error);
            if (error.response && error.response.status === 403) {
                toast.error("You can only delete photos that you uploaded.");
            } else {
                toast.error("Failed to delete photos");
            }
        } finally {
            setIsDeleting(false);
            setBulkDeleteModalOpen(false);
        }
    };

    const confirmQuickDelete = async () => {
        if (photoToDelete) {
            setIsDeleting(true);
            try {
                await deletePhotos([photoToDelete.id]);
                await loadPaginatedPhotos();
                toast.success("Photo deleted successfully");
            } catch (error) {
                console.error("Delete failed", error);
                if (error.response && error.response.status === 403) {
                    toast.error("You can only delete photos that you uploaded.");
                } else {
                    toast.error("Failed to delete photo");
                }
            } finally {
                setIsDeleting(false);
                setPhotoToDelete(null);
            }
        }
    };

    const members = ['All', ...new Set((photos || []).map(p => p.uploader))];
    const filteredPhotos = activeFilter === 'All' ? photos : photos.filter(p => p.uploader === activeFilter);

    if (!collection) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <h2 className="text-xl font-semibold mb-2">Collection not found</h2>
                <Link to="/galleriq/collections" className="text-blue-600 hover:underline">Return to Collections</Link>
            </div>
        );
    }

    const handleCopyCode = () => {
        navigator.clipboard.writeText(collection.join_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);

        // Create initial queue items with previews
        const newQueueItems = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            previewUrl: URL.createObjectURL(file),
            progress: 0,
            status: 'pending', // pending, uploading, completed, error
            error: null
        }));

        setUploadQueue(prev => [...prev, ...newQueueItems]);

        // Process uploads
        // We'll process all in parallel for now, or could limit concurrency
        // Keeping it simple so they all start "loading"
        const uploadPromises = newQueueItems.map(async (item) => {
            try {
                // Update status to uploading
                setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));

                await uploadPhoto(item.file, collection.id, (progress) => {
                    setUploadQueue(prev => prev.map(p =>
                        p.id === item.id ? { ...p, progress } : p
                    ));
                });

                // Mark completed
                setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'completed', progress: 100 } : p));

                // We don't verify success via returned object here, assuming no throw = success
                return { success: true };
            } catch (error) {
                console.error("Upload failed for", item.file.name, error);
                setUploadQueue(prev => prev.map(p =>
                    p.id === item.id ? { ...p, status: 'error', error: error.message } : p
                ));
                return { success: false };
            }
        });

        await Promise.all(uploadPromises);

        // Check overall completion
        await loadPaginatedPhotos();

        // Wait a moment to show 100% then clear
        setTimeout(() => {
            setUploadQueue([]);
            setIsUploading(false);
            toast.success(`Successfully uploaded ${files.length} photos`);
        }, 1000);
    };

    return (
        <div className="max-w-6xl mx-auto relative">
            <div className="mb-8">
                <Link to="/galleriq/collections" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Collections
                </Link>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{photos.length} photos</span>
                            <span>•</span>
                            <span>Created {collection.created_at ? new Date(collection.created_at).toLocaleDateString() : 'Recently'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white border border-gray-200 p-1 pl-4 rounded-xl shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Invite Code</span>
                                <span className="font-mono text-lg font-bold text-gray-900">{collection.join_code}</span>
                            </div>
                            <button onClick={handleCopyCode} className="p-3 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors" title="Copy Code">
                                {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                            </button>
                        </div>

                        <button onClick={handleDeleteCollection} className="p-3 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-xl transition-colors" title="Delete Trip">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Compact Members Section */}
            {collection.members && collection.members.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team</h2>
                        <span className="text-xs text-gray-400">({collection.members.length})</span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {collection.members.map((member) => (
                            <div
                                key={member.user_id}
                                className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2 hover:border-gray-200 transition-colors shrink-0"
                                title={`${member.name} (${member.email})`}
                            >
                                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium text-xs">
                                    {member.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                {member.role === 'admin' && (
                                    <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        Admin
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Queue Grid */}
            {uploadQueue.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Upload size={20} className="text-blue-500" />
                        <h3 className="font-semibold text-gray-900">Uploading {uploadQueue.length} photos...</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {uploadQueue.map(item => (
                            <div key={item.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={item.previewUrl} alt="uploading" className="w-full h-full object-cover opacity-80" />

                                {/* Status Overlay */}
                                {item.status === 'error' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                                        <X className="text-red-600 drop-shadow-md" size={32} />
                                    </div>
                                )}

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                                    <div
                                        className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-40 mb-6 bg-black text-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedIds([])} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                            <span className="font-medium">{selectedIds.length} Selected</span>
                        </div>
                        <button onClick={selectAll} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
                            {selectedIds.length === filteredPhotos.length ? 'Unselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="grid grid-cols-3 w-full md:w-auto md:flex items-center gap-3">
                        <button
                            onClick={async () => {
                                await bulkToggleFavorite(selectedIds, true);
                                // Update local state
                                setLocalPhotos(prev => prev.map(p =>
                                    selectedIds.includes(p.id) ? { ...p, isFavorite: true } : p
                                ));
                                toast.success(`Added ${selectedIds.length} photos to favorites`);
                                setSelectedIds([]);
                                setIsSelectionMode(false);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
                        >
                            <Heart size={16} className="fill-white" /> <span className="hidden sm:inline">Favorite</span>
                        </button>
                        <button onClick={handleBulkDownload} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
                            <Download size={16} /> <span className="hidden sm:inline">Download</span>
                        </button>
                        <button onClick={() => setBulkDeleteModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                            <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {members.map(member => (
                        <button
                            key={member}
                            onClick={() => setActiveFilter(member)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === member ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {member === 'All' ? 'All Photos' : member}
                        </button>
                    ))}

                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Compact Pagination */}
                    {totalItems > 0 && (
                        <div className="flex items-center gap-3 bg-white border border-gray-200 p-1 pl-3 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mr-2 border-r border-gray-100 pr-3">
                                <span className="hidden sm:inline">Show</span>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsLimitOpen(!isLimitOpen)}
                                        className="flex items-center gap-1.5 font-semibold text-gray-900 hover:text-black hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
                                    >
                                        {limit}
                                        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isLimitOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isLimitOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsLimitOpen(false)} />
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden min-w-[3rem]">
                                                {[10, 20, 50, 100].map(value => (
                                                    <button
                                                        key={value}
                                                        onClick={() => {
                                                            setLimit(value);
                                                            setPage(1);
                                                            setIsLimitOpen(false);
                                                        }}
                                                        className={`w-full text-center py-2 px-3 text-xs font-medium transition-colors ${limit === value ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        {value}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-gray-400 min-w-[3rem] text-center mr-1">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${isSelectionMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                            Select
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,video/*" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isUploading ? 'Uploading...' : 'Add Photos'}
                        </button>
                    </div>
                </div>
            </div>



            {isLoadingPhotos ? (
                <div className="flex justify-center p-12">
                    <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
            ) : photos.length > 0 ? (
                <div className="h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent rounded-xl border border-gray-100/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                        {filteredPhotos.map((photo, index) => {
                            const isSelected = selectedIds.includes(photo.id);
                            return (
                                <div
                                    key={photo.id}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleSelection(photo.id);
                                        } else {
                                            setLightboxIndex(index);
                                        }
                                    }}
                                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden relative group border cursor-pointer transition-all duration-200 ${isSelected ? 'ring-4 ring-blue-500 border-transparent p-1' : 'border-gray-100 hover:shadow-md'}`}
                                >
                                    {photo.type?.startsWith('video/') ? (
                                        <div className="w-full h-full relative">
                                            <video src={photo.previewUrl} className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'rounded-md' : 'group-hover:scale-105'}`} muted playsInline />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="bg-black/30 p-2 rounded-full backdrop-blur-sm">
                                                    <Play size={24} className="fill-white text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img src={photo.previewUrl} alt={photo.name} className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'rounded-md' : 'group-hover:scale-105'}`} loading="lazy" />
                                    )}
                                    <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/20'}`} />

                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs truncate font-medium">{photo.uploader}</p>
                                    </div>

                                    {(isSelectionMode || isSelected) && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(photo.id);
                                            }}
                                            className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${isSelected ? 'bg-blue-50 border-blue-500 text-white' : 'bg-white/80 border-gray-300 hover:bg-white'}`}
                                        >
                                            {isSelected && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    )}

                                    {!isSelectionMode && (
                                        <button
                                            onClick={(e) => handleToggleFavorite(photo.id, e)}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity opacity-0 group-hover:opacity-100"
                                        >
                                            <Heart size={16} className={`transition-colors ${photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                                        </button>
                                    )}

                                    {!isSelectionMode && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPhotoToDelete(photo);
                                            }}
                                            className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-400 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                                            title="Delete Photo"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-gray-50/50">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <ImageIcon size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No photos yet</h3>
                    <p className="text-gray-500 mt-1 max-w-sm">
                        Share the code <span className="font-mono font-bold text-gray-700 bg-gray-200 px-1 rounded">{collection.join_code}</span> with friends to get started!
                    </p>
                    <button onClick={() => fileInputRef.current?.click()} className="mt-6 text-blue-600 font-medium hover:underline flex items-center gap-2">
                        <Plus size={16} /> Add the first photo
                    </button>
                </div>
            )}



            {lightboxIndex >= 0 && (
                <Lightbox
                    photo={filteredPhotos[lightboxIndex]}
                    onClose={() => setLightboxIndex(-1)}
                    onNext={() => setLightboxIndex(i => Math.min(i + 1, filteredPhotos.length - 1))}
                    onPrev={() => setLightboxIndex(i => Math.max(i - 1, 0))}
                    hasNext={lightboxIndex < filteredPhotos.length - 1}
                    hasPrev={lightboxIndex > 0}
                    onToggleFavorite={(id) => handleToggleFavorite(id)}
                />
            )}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => !isDeleting && setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Collection"
                message={`Are you sure you want to delete "${collection.name}"? This will permanently delete all photos in this collection.`}
                isDeleting={isDeleting}
            />

            <DeleteConfirmationModal
                isOpen={bulkDeleteModalOpen}
                onClose={() => !isDeleting && setBulkDeleteModalOpen(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Photos"
                message={`Are you sure you want to delete ${selectedIds.length} photo${selectedIds.length > 1 ? 's' : ''}?`}
                isDeleting={isDeleting}
            />

            <DeleteConfirmationModal
                isOpen={!!photoToDelete}
                onClose={() => !isDeleting && setPhotoToDelete(null)}
                onConfirm={confirmQuickDelete}
                title="Delete Photo"
                message="Are you sure you want to delete this photo?"
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default CollectionDetailsPage;
