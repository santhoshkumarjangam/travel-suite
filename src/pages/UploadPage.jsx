import React, { useState, useRef } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useTrips } from '../context/TripContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, AlertCircle, ChevronDown, Folder, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
    const { uploadPhoto, currentUser } = usePhotos();
    const { trips: collections } = useTrips();
    const toast = useToast(); // Use global toast directly
    const navigate = useNavigate();
    const [uploadQueue, setUploadQueue] = useState([]);

    // Initialize from session storage
    const [targetCollectionId, setTargetCollectionId] = useState(() => {
        return sessionStorage.getItem('lastUploadCollectionId') || '';
    });

    // Persist selection
    React.useEffect(() => {
        if (targetCollectionId) {
            sessionStorage.setItem('lastUploadCollectionId', targetCollectionId);
        }
    }, [targetCollectionId]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    // Remove local success state
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const validateAndAddFiles = (newFiles) => {
        setError('');
        const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.heic'));

        if (validFiles.length !== newFiles.length) {
            setError('Some files were skipped (not images).');
        }

        if (uploadQueue.length + validFiles.length > 20) {
            setError('Upload limit is 20 photos per batch.');
            const remainingSlots = 20 - uploadQueue.length;
            if (remainingSlots > 0) {
                const newItems = validFiles.slice(0, remainingSlots).map(file => ({
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    previewUrl: URL.createObjectURL(file), // Generate preview immediately
                    progress: 0,
                    status: 'pending'
                }));
                setUploadQueue(prev => [...prev, ...newItems]);
            }
        } else {
            const newItems = validFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                previewUrl: URL.createObjectURL(file),
                progress: 0,
                status: 'pending'
            }));
            setUploadQueue(prev => [...prev, ...newItems]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        validateAndAddFiles(e.dataTransfer.files);
    };

    const handleUpload = async () => {
        if (!currentUser?.name) {
            setError('User identity missing. Please reload.');
            return;
        }
        if (uploadQueue.length === 0) {
            setError('Please select files to upload.');
            return;
        }

        // Process queue
        // We'll process parallel
        setUploadQueue(prev => prev.map(p => ({ ...p, status: 'uploading' })));

        const uploadPromises = uploadQueue.map(async (item) => {
            try {
                await uploadPhoto(item.file, targetCollectionId || null, (progress) => {
                    setUploadQueue(prev => prev.map(p =>
                        p.id === item.id ? { ...p, progress } : p
                    ));
                });

                // Mark completed
                setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'completed', progress: 100 } : p));
                return { success: true };
            } catch (error) {
                setUploadQueue(prev => prev.map(p =>
                    p.id === item.id ? { ...p, status: 'error' } : p
                ));
                return { success: false };
            }
        });

        await Promise.all(uploadPromises);

        // Success Flow:
        // 1. Wait a moment so user sees the "100%" bars
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2. Clear the queue
        setUploadQueue([]);

        // 3. Show success message (now that queue is cleared)
        toast.success(`Successfully uploaded ${uploadQueue.length} photos!`);
        setSuccess(false); // Reset local flag just in case
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-gray-900">Upload Photos</h1>
                <p className="text-gray-500 mt-1">Add new memories to your collection.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* User Identity Banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {currentUser?.name?.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm text-blue-900 font-medium">Uploading as {currentUser?.name}</p>
                            <p className="text-xs text-blue-700">Photos will be tagged with your name automatically.</p>
                        </div>
                    </div>

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center
              ${isDragging
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'}
            `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => validateAndAddFiles(e.target.files)}
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                        />
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Upload className="text-gray-600" size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Click or drag photos & videos here</h3>
                        <p className="text-xs text-text-secondary mt-1">Up to 20 items at a time (JPG, PNG, HEIC, MP4, MOV)</p>
                    </div>

                    {/* File Lists */}
                    <AnimatePresence>
                        {uploadQueue.length > 0 && (
                            <div className="card max-h-[400px] overflow-y-auto">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready to Upload ({uploadQueue.length})</span>
                                    <button onClick={() => setUploadQueue([])} disabled={uploadQueue.some(i => i.status === 'uploading')} className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Clear All</button>
                                </div>
                                {uploadQueue.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="relative group border-b border-gray-100 last:border-0 hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3 p-3 relative z-10">
                                            <img src={item.previewUrl} className="w-10 h-10 rounded object-cover border border-gray-200" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                                                <p className="text-xs text-gray-500">{(item.file.size / 1024).toFixed(0)} KB</p>
                                            </div>

                                            {/* Action / Status Icon */}
                                            {item.status === 'pending' && (
                                                <button onClick={() => setUploadQueue(uploadQueue.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500">
                                                    <X size={16} />
                                                </button>
                                            )}
                                            {item.status === 'completed' && <Check size={16} className="text-green-500" />}
                                            {item.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                        </div>

                                        {/* Progress Bar Background (Fill) */}
                                        {item.status === 'uploading' && (
                                            <div
                                                className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300 pointer-events-none"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: Actions & Status */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card p-5 sticky top-24 overflow-visible">
                        <h3 className="font-medium text-sm mb-4">Summary</h3>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Files selected</span>
                            <span className="font-medium">{uploadQueue.length}</span>
                        </div>


                        <div className="mb-4 relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Album (Required)</label>

                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-gray-300 transition-colors focus:ring-2 focus:ring-black/5 outline-none"
                            >
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <div className={`p-1.5 rounded-md ${targetCollectionId ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Folder size={16} />
                                    </div>
                                    <span className="truncate">
                                        {targetCollectionId
                                            ? collections.find(c => c.id === targetCollectionId)?.name
                                            : 'Select Album...'}
                                    </span>
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsDropdownOpen(false)}
                                    />
                                    <div className="absolute bottom-full left-0 right-0 mb-2 lg:top-full lg:bottom-auto lg:mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 focus:outline-none">
                                        {collections.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setTargetCollectionId(c.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className={`text-sm truncate ${targetCollectionId === c.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                        {c.name}
                                                    </span>
                                                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{c.code}</span>
                                                </div>
                                                {targetCollectionId === c.id && <Check size={16} className="text-blue-600" />}
                                            </button>
                                        ))}

                                        {collections.length === 0 && (
                                            <div className="p-3 text-center text-xs text-gray-400">
                                                No albums created yet.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs mb-4">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={uploadQueue.length === 0 || !targetCollectionId || uploadQueue.some(i => i.status === 'uploading')}
                            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!targetCollectionId ? "Please select an album first" : ""}
                        >
                            {uploadQueue.some(i => i.status === 'uploading') ? 'Uploading...' : 'Start Upload'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
