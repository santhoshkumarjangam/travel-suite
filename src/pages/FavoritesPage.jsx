import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { media } from '../services/api';
import Lightbox from '../components/Lightbox';
import ConfirmationModal from '../components/ConfirmationModal';
import { Heart, Download, CheckSquare, Square, X, Check, ChevronLeft, ChevronRight, Loader2, HeartOff, ChevronDown } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const FavoritesPage = () => {
    const { toggleFavorite, bulkToggleFavorite } = usePhotos();
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [isLimitOpen, setIsLimitOpen] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [localPhotos, setLocalPhotos] = useState([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Confirmation State
    const [unfavoriteModalOpen, setUnfavoriteModalOpen] = useState(false);
    const [itemsToUnfavorite, setItemsToUnfavorite] = useState([]);

    const loadPaginatedFavorites = React.useCallback(async () => {
        setIsLoadingPhotos(true);
        try {
            const response = await media.getFavorites(page, limit);
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
            console.error("Failed to load favorites", error);
        } finally {
            setIsLoadingPhotos(false);
        }
    }, [page, limit]);

    React.useEffect(() => {
        loadPaginatedFavorites();
    }, [loadPaginatedFavorites]);

    const favoritePhotos = localPhotos;

    const handleDownload = (e, photo) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = photo.previewUrl;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Bulk Actions
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
        if (selectedIds.length === favoritePhotos.length) {
            setSelectedIds([]);
            setIsSelectionMode(false);
        } else {
            setSelectedIds(favoritePhotos.map(p => p.id));
            setIsSelectionMode(true);
        }
    };

    const handleBulkDownload = async () => {
        const selectedPhotos = favoritePhotos.filter(p => selectedIds.includes(p.id));

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

    const promptUnfavorite = (photoId) => {
        setItemsToUnfavorite([photoId]);
        setUnfavoriteModalOpen(true);
    };

    const promptBulkUnfavorite = () => {
        setItemsToUnfavorite(selectedIds);
        setUnfavoriteModalOpen(true);
    };

    const handleConfirmUnfavorite = async () => {
        // Optimistic update (optional, but good for perceived speed)
        setLocalPhotos(prev => prev.filter(p => !itemsToUnfavorite.includes(p.id)));

        // Call API
        await bulkToggleFavorite(itemsToUnfavorite, false);

        // Refresh grid
        await loadPaginatedFavorites();

        // Cleanup
        setItemsToUnfavorite([]);
        if (selectedIds.length > 0) {
            setSelectedIds([]);
            setIsSelectionMode(false);
        }
        setUnfavoriteModalOpen(false);
    };

    return (
        <div className="max-w-7xl mx-auto relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Heart className="text-red-500 fill-red-500" /> Favorites
                    </h1>
                    <p className="text-gray-500 mt-1">Your personal collection of liked photos.</p>
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

                    {favoritePhotos.length > 0 && (
                        <button
                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                            className={`px-3 py-1.5 max-h-[38px] rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${isSelectionMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                            Select
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions Header - Sticky */}
            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-40 mb-6 bg-black text-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedIds([])} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                            <span className="font-medium">{selectedIds.length} Selected</span>
                        </div>
                        <button
                            onClick={selectAll}
                            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
                        >
                            {selectedIds.length === favoritePhotos.length ? 'Unselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 w-full md:w-auto md:flex items-center gap-3">
                        <button
                            onClick={promptBulkUnfavorite}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <Heart size={16} className="fill-red-600" /> <span className="hidden sm:inline">Unfavorite</span>
                        </button>
                        <button
                            onClick={handleBulkDownload}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Download size={16} /> <span className="hidden sm:inline">Download</span>
                        </button>
                    </div>
                </div>
            )}



            {isLoadingPhotos ? (
                <div className="flex justify-center p-12">
                    <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
            ) : favoritePhotos.length > 0 ? (
                <div className="h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent rounded-xl border border-gray-100/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                        {favoritePhotos.map((photo, index) => {
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
                                    <img
                                        src={photo.previewUrl}
                                        alt={photo.name}
                                        className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'rounded-md' : 'group-hover:scale-105'}`}
                                    />
                                    <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/20'}`} />

                                    {/* Metadata Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs truncate font-medium">{photo.uploader}</p>
                                        <p className="text-white/80 text-[10px] truncate">{new Date(photo.timestamp).toLocaleDateString()}</p>
                                    </div>

                                    {/* Selection Checkbox */}
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
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Heart Button (Unfavorite) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    promptUnfavorite(photo.id);
                                                }}
                                                className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity"
                                                title="Unfavorite"
                                            >
                                                <Heart size={16} className="text-red-500 fill-red-500" />
                                            </button>
                                            {/* Download Button */}
                                            <button
                                                onClick={(e) => handleDownload(e, photo)}
                                                className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity text-gray-700"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Heart size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No favorites yet</h3>
                    <p className="text-gray-500 mt-1">
                        Tap the heart icon on any photo to add it here.
                    </p>
                </div>
            )}



            <ConfirmationModal
                isOpen={unfavoriteModalOpen}
                onClose={() => setUnfavoriteModalOpen(false)}
                onConfirm={handleConfirmUnfavorite}
                title="Remove from Favorites?"
                message={`Are you sure you want to remove ${itemsToUnfavorite.length > 1 ? `these ${itemsToUnfavorite.length} photos` : 'this photo'} from your favorites?`}
                confirmText="Remove"
                confirmColor="bg-red-600 hover:bg-red-700"
                icon={HeartOff}
            />

            {lightboxIndex >= 0 && (
                <Lightbox
                    photo={favoritePhotos[lightboxIndex]}
                    onClose={() => setLightboxIndex(-1)}
                    onNext={() => setLightboxIndex(i => Math.min(i + 1, favoritePhotos.length - 1))}
                    onPrev={() => setLightboxIndex(i => Math.max(i - 1, 0))}
                    hasNext={lightboxIndex < favoritePhotos.length - 1}
                    hasPrev={lightboxIndex > 0}
                />
            )}
        </div>
    );
};

export default FavoritesPage;
