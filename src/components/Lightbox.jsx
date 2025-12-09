import React, { useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';

const Lightbox = ({ photo, onClose, onNext, onPrev, hasNext, hasPrev }) => {
    const { deletePhoto } = usePhotos();

    // Handle Keyboard Events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && hasNext) onNext();
            if (e.key === 'ArrowLeft' && hasPrev) onPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev, hasNext, hasPrev]);

    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = photo.previewUrl;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this photo?')) {
            deletePhoto(photo.id);
            onClose();
        }
    };

    if (!photo) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                <button
                    onClick={handleDelete}
                    className="text-white/70 hover:text-red-500 p-2 transition-colors rounded-full hover:bg-white/10"
                    title="Delete Photo"
                >
                    <Trash2 size={24} />
                </button>
                <button
                    onClick={handleDownload}
                    className="text-white/70 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10"
                    title="Download"
                >
                    <Download size={24} />
                </button>
                <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Navigation Left */}
            <button
                onClick={onPrev}
                disabled={!hasPrev}
                className={`absolute left-4 p-4 text-white/50 hover:text-white transition-colors ${!hasPrev ? 'opacity-0 pointer-events-none' : ''}`}
            >
                <ChevronLeft size={48} />
            </button>

            {/* Main Image Container */}
            <div className="relative max-w-7xl max-h-screen p-4 flex flex-col items-center">
                {photo.type?.startsWith('video/') ? (
                    <video
                        src={photo.previewUrl}
                        controls
                        autoPlay
                        className="max-h-[85vh] max-w-full shadow-2xl rounded-sm"
                    />
                ) : (
                    <img
                        src={photo.previewUrl}
                        alt={photo.name}
                        className="max-h-[85vh] max-w-full object-contain shadow-2xl rounded-sm"
                    />
                )}

                {/* Metadata Overlay */}
                <div className="mt-4 text-center">
                    <p className="text-white font-medium text-lg">{photo.uploader}</p>
                    <p className="text-white/50 text-sm">
                        {new Date(photo.timestamp).toLocaleDateString()} • {new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>

            {/* Navigation Right */}
            <button
                onClick={onNext}
                disabled={!hasNext}
                className={`absolute right-4 p-4 text-white/50 hover:text-white transition-colors ${!hasNext ? 'opacity-0 pointer-events-none' : ''}`}
            >
                <ChevronRight size={48} />
            </button>
        </div>
    );
};

export default Lightbox;
