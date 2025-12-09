import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import Lightbox from '../components/Lightbox';
import { Heart, Download, CheckSquare, Square, X, Check } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const FavoritesPage = () => {
    const { photos, toggleFavorite, bulkToggleFavorite } = usePhotos();
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const favoritePhotos = photos.filter(photo => photo.isFavorite);

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
        const zip = new JSZip();
        const selectedPhotos = favoritePhotos.filter(p => selectedIds.includes(p.id));

        const promises = selectedPhotos.map(async (photo) => {
            try {
                const response = await fetch(photo.previewUrl);
                const blob = await response.blob();
                zip.file(photo.name, blob);
            } catch (err) {
                console.error("Failed to add file to zip", photo.name, err);
            }
        });

        await Promise.all(promises);

        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, `Favorites_photos.zip`);
            setSelectedIds([]);
            setIsSelectionMode(false);
        });
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

                {favoritePhotos.length > 0 && (
                    <button
                        onClick={() => setIsSelectionMode(!isSelectionMode)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${isSelectionMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                        Select
                    </button>
                )}
            </div>

            {/* Bulk Actions Header - Sticky */}
            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-40 mb-6 bg-black text-white p-4 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedIds([])} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                        <span className="font-medium">{selectedIds.length} Selected</span>
                        <button
                            onClick={selectAll}
                            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
                        >
                            {selectedIds.length === favoritePhotos.length ? 'Unselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                bulkToggleFavorite(selectedIds, false); // false to unfavorite
                                setSelectedIds([]);
                                setIsSelectionMode(false);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <Heart size={16} className="fill-red-600" /> Unfavorite
                        </button>
                        <button
                            onClick={handleBulkDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Download size={16} /> Download
                        </button>
                    </div>
                </div>
            )}

            {favoritePhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/80 border-gray-300 hover:bg-white'}`}
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
                                                toggleFavorite(photo.id);
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
