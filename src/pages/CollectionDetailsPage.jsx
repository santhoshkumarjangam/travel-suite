import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePhotos } from '../context/PhotoContext';
import { useTrips } from '../context/TripContext';
import { useToast } from '../context/ToastContext';
import Lightbox from '../components/Lightbox';
import { ArrowLeft, Copy, Check, Upload, Image as ImageIcon, Plus, Trash2, Download, X, Square, CheckSquare, Heart, Play } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const CollectionDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPhotosByCollection, addPhotos, deletePhotos, toggleFavorite, bulkToggleFavorite, currentUser, loadPhotos } = usePhotos();
    const { getTrip, deleteTrip } = useTrips();
    const toast = useToast();

    React.useEffect(() => {
        if (id) {
            loadPhotos(id);
        }
    }, [id]);

    const collection = getTrip(id);
    const photos = getPhotosByCollection(id);
    const deleteCollection = deleteTrip;

    const [activeFilter, setActiveFilter] = useState('All');
    const [copied, setCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const fileInputRef = useRef(null);

    const handleDeleteCollection = () => {
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (collection) {
            const result = await deleteCollection(collection.id);
            if (result.success) {
                navigate('/galleriq/collections');
            } else {
                toast.error(result.message);
                setDeleteModalOpen(false);
            }
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
        const zip = new JSZip();
        const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

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
            saveAs(content, `${collection.name}_photos.zip`);
            setSelectedIds([]);
            setIsSelectionMode(false);
        });
    };

    const confirmBulkDelete = () => {
        deletePhotos(selectedIds);
        setSelectedIds([]);
        setIsSelectionMode(false);
        setBulkDeleteModalOpen(false);
    };

    const confirmQuickDelete = () => {
        if (photoToDelete) {
            deletePhotos([photoToDelete.id]);
            setPhotoToDelete(null);
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
        try {
            await addPhotos(currentUser.name, e.target.files, collection.id);
        } catch (err) {
            console.error("Upload failed", err);
            alert(`Failed to upload photos: ${err.message || err.toString()}`);
        }
        setIsUploading(false);
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

            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-40 mb-6 bg-black text-white p-4 rounded-xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedIds([])} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                        <span className="font-medium">{selectedIds.length} Selected</span>
                        <button onClick={selectAll} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
                            {selectedIds.length === filteredPhotos.length ? 'Unselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                bulkToggleFavorite(selectedIds, true);
                                setSelectedIds([]);
                                setIsSelectionMode(false);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
                        >
                            <Heart size={16} className="fill-white" /> Favorite
                        </button>
                        <button onClick={handleBulkDownload} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
                            <Download size={16} /> Download
                        </button>
                        <button onClick={() => setBulkDeleteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                            <Trash2 size={16} /> Delete
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
                    <button
                        onClick={() => setIsSelectionMode(!isSelectionMode)}
                        className={`ml-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${isSelectionMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                        Select
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,video/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                        <Upload size={16} /> Add Photos
                    </button>
                </div>
            </div>

            {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/80 border-gray-300 hover:bg-white'}`}
                                    >
                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                    </div>
                                )}

                                {!isSelectionMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(photo.id);
                                        }}
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
                />
            )}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Collection"
                message={`Are you sure you want to delete "${collection.name}"? This will permanently delete all photos in this collection.`}
            />

            <DeleteConfirmationModal
                isOpen={bulkDeleteModalOpen}
                onClose={() => setBulkDeleteModalOpen(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Photos"
                message={`Are you sure you want to delete ${selectedIds.length} photo${selectedIds.length > 1 ? 's' : ''}?`}
            />

            <DeleteConfirmationModal
                isOpen={!!photoToDelete}
                onClose={() => setPhotoToDelete(null)}
                onConfirm={confirmQuickDelete}
                title="Delete Photo"
                message="Are you sure you want to delete this photo?"
            />
        </div>
    );
};

export default CollectionDetailsPage;
