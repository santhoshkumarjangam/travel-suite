import React, { useState, useRef } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useTrips } from '../context/TripContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, AlertCircle, ChevronDown, Folder, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
    const { addPhotos, currentUser } = usePhotos();
    const { trips: collections } = useTrips();
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [targetCollectionId, setTargetCollectionId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
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

        if (files.length + validFiles.length > 20) {
            setError('Upload limit is 20 photos per batch.');
            const remainingSlots = 20 - files.length;
            if (remainingSlots > 0) {
                setFiles(prev => [...prev, ...validFiles.slice(0, remainingSlots)]);
            }
        } else {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        validateAndAddFiles(e.dataTransfer.files);
    };

    const handleUpload = () => {
        if (!currentUser?.name) {
            setError('User identity missing. Please reload.');
            return;
        }
        if (files.length === 0) {
            setError('Please select files to upload.');
            return;
        }

        addPhotos(currentUser.name, files, targetCollectionId || null);
        setSuccess(true);
        setFiles([]);
        setTimeout(() => {
            setSuccess(false);
        }, 2000);
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
                            {currentUser?.name?.charAt(0) || 'U'}
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
                        {files.length > 0 && (
                            <div className="card max-h-[400px] overflow-y-auto">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready to Upload ({files.length})</span>
                                    <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
                                </div>
                                {files.map((file, idx) => (
                                    <motion.div
                                        key={`${file.name}-${idx}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50"
                                    >
                                        <img src={URL.createObjectURL(file)} className="w-10 h-10 rounded object-cover border border-gray-200" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                            <X size={16} />
                                        </button>
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
                            <span className="font-medium">{files.length}</span>
                        </div>


                        <div className="mb-4 relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Add to Album (Optional)</label>

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
                                        <button
                                            onClick={() => {
                                                setTargetCollectionId('');
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                        >
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900">None (Gallery Only)</span>
                                            {targetCollectionId === '' && <Check size={16} className="text-blue-600" />}
                                        </button>

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
                        {success && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-md text-green-700 text-xs mb-4 font-medium">
                                Upload successful!
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={files.length === 0}
                            className="btn-primary w-full justify-center"
                        >
                            Start Upload
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
