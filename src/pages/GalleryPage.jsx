import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useTrips } from '../context/TripContext';
import { Folder, ArrowLeft, Image as ImageIcon, Calendar, HardDrive, Search, MoreVertical, Users, Grid, List, Heart, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Lightbox from '../components/Lightbox';

const GalleryPage = () => {
    const { uploaders, getPhotosByUploader, currentUser, toggleFavorite, photos: allPhotos } = usePhotos();
    const { trips: collections } = useTrips();
    const navigate = useNavigate();
    const [selectedUploader, setSelectedUploader] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('folders'); // 'folders' | 'photos'
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    const handleDownload = (e, photo) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = photo.previewUrl;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter collections relevant to user
    const relevantCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (c.creatorId === currentUser?.id || c.members?.includes(currentUser?.id))
    );

    // Filter uploaders: Only show uploaders who have photos NOT in a collection
    const filteredUploaders = uploaders.filter(u => {
        const matchesSearch = u.toLowerCase().includes(searchQuery.toLowerCase());
        const hasUnsortedPhotos = allPhotos.some(p => p.uploader === u && !p.collectionId);
        return matchesSearch && hasUnsortedPhotos;
    });

    // Filter all photos
    const filteredAllPhotos = allPhotos.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.uploader.toLowerCase().includes(searchQuery.toLowerCase()));

    // Helper to get unsorted photos for selected uploader
    const getUnsortedPhotos = (uploader) => {
        return getPhotosByUploader(uploader).filter(p => !p.collectionId);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                        {selectedUploader ? selectedUploader : 'Gallery'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {selectedUploader ? 'Viewing unsorted photos' : 'Browse your memories'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {!selectedUploader && (
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
                            <button
                                onClick={() => setViewMode('folders')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'folders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Folders
                            </button>
                            <button
                                onClick={() => setViewMode('photos')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'photos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                All Photos
                            </button>
                        </div>
                    )}

                    {!selectedUploader && (
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 w-full md:w-48 transition-colors"
                            />
                        </div>
                    )}
                    {selectedUploader && (
                        <button
                            onClick={() => setSelectedUploader(null)}
                            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            <ArrowLeft size={16} className="mr-2" /> Back
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {(!selectedUploader && viewMode === 'folders') ? (
                /* Folder Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Render Collections First */}
                    {relevantCollections.map(collection => {
                        const count = allPhotos.filter(p => p.collectionId === collection.id).length;
                        return (
                            <div
                                key={collection.id}
                                onClick={() => navigate(`/galleriq/collections/${collection.id}`)}
                                className="group bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all hover:border-black active:scale-95"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-lg group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                        {count}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{collection.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">Shared Album</p>
                            </div>
                        );
                    })}

                    {/* Render Uploaders Second */}
                    {filteredUploaders.map(uploader => {
                        const count = allPhotos.filter(p => p.uploader === uploader && !p.collectionId).length;
                        return (
                            <div
                                key={uploader}
                                onClick={() => setSelectedUploader(uploader)}
                                className="group bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all hover:border-blue-500 active:scale-95"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Folder size={20} />
                                    </div>
                                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                        {count}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{uploader}</h3>
                                <p className="text-xs text-gray-500 mt-1">Unsorted</p>
                            </div>
                        );
                    })}

                    {filteredUploaders.length === 0 && relevantCollections.length === 0 && (
                        <div className="col-span-full py-12 md:py-20 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <p className="text-gray-400 text-sm">No items found.</p>
                        </div>
                    )}
                </div>
            ) : (!selectedUploader && viewMode === 'photos') ? (
                /* All Photos Grid View */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAllPhotos.map((photo) => (
                        <div
                            key={photo.id}
                            onClick={() => setLightboxIndex(filteredAllPhotos.indexOf(photo))}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                        >
                            <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                            {/* Metadata Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-xs truncate font-medium">{photo.uploader}</p>
                                <p className="text-white/80 text-[10px] truncate">{new Date(photo.timestamp).toLocaleDateString()}</p>
                            </div>

                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Heart Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(photo.id);
                                    }}
                                    className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity"
                                >
                                    <Heart
                                        size={16}
                                        className={`transition-colors ${photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                                    />
                                </button>
                                {/* Download Button */}
                                <button
                                    onClick={(e) => handleDownload(e, photo)}
                                    className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity text-gray-700"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredAllPhotos.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-400">No photos found.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Data View (Selected Uploader) */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {getUnsortedPhotos(selectedUploader).map((photo, index) => (
                        <div
                            key={photo.id}
                            onClick={() => setLightboxIndex(index)}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                        >
                            <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                            {/* Metadata Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-xs truncate font-medium">{photo.uploader}</p>
                                <p className="text-white/80 text-[10px] truncate">{new Date(photo.timestamp).toLocaleDateString()}</p>
                            </div>

                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Heart Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(photo.id);
                                    }}
                                    className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity"
                                >
                                    <Heart
                                        size={16}
                                        className={`transition-colors ${photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                                    />
                                </button>
                                {/* Download Button */}
                                <button
                                    onClick={(e) => handleDownload(e, photo)}
                                    className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-opacity text-gray-700"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {getUnsortedPhotos(selectedUploader).length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-400">No unsorted photos in this folder.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex >= 0 && (
                <Lightbox
                    photo={selectedUploader && viewMode !== 'photos'
                        ? getUnsortedPhotos(selectedUploader)[lightboxIndex]
                        : filteredAllPhotos[lightboxIndex]}
                    onClose={() => setLightboxIndex(-1)}
                    onNext={() => {
                        const list = selectedUploader && viewMode !== 'photos'
                            ? getUnsortedPhotos(selectedUploader)
                            : filteredAllPhotos;
                        setLightboxIndex(i => Math.min(i + 1, list.length - 1));
                    }}
                    onPrev={() => setLightboxIndex(i => Math.max(i - 1, 0))}
                    hasNext={lightboxIndex < (selectedUploader && viewMode !== 'photos'
                        ? getUnsortedPhotos(selectedUploader).length
                        : filteredAllPhotos.length) - 1}
                    hasPrev={lightboxIndex > 0}
                />
            )}
        </div>
    );
};

export default GalleryPage;
