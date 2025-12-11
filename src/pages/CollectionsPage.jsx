import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { useTrips } from '../context/TripContext';
import { useToast } from '../context/ToastContext';
import { Plus, Hash, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const CollectionsPage = () => {
    const { currentUser, photos } = usePhotos();
    const { trips: collections, addTrip: createCollection, deleteTrip: deleteCollection, joinTrip: joinCollection } = useTrips();
    const toast = useToast();
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState(null);

    if (!collections) {
        return <div className="p-8 text-center text-gray-500">Loading collections...</div>;
    }

    // DEBUG: Showing ALL collections to debug visibility
    const createdByMe = collections;
    const joinedByMe = [];

    const handleCreate = async (e) => {
        e.preventDefault();
        console.log('handleCreate called with name:', newCollectionName);
        if (newCollectionName.trim()) {
            try {
                console.log('Calling createCollection...');
                const result = await createCollection(newCollectionName, null);
                console.log('createCollection returned:', result);
                setNewCollectionName('');
                setShowCreateModal(false);
                console.log('Modal closed successfully');
            } catch (error) {
                console.error('Failed to create collection:', error);
                toast.error('Failed to create collection. Please try again.');
            }
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (joinCode.length === 6) {
            const success = await joinCollection(joinCode);
            if (success) {
                setJoinCode('');
                setJoinError('');
            } else {
                setJoinError('Invalid code');
            }
        }
    };

    const confirmDelete = (collection) => {
        setCollectionToDelete(collection);
        setDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (collectionToDelete) {
            const result = await deleteCollection(collectionToDelete.id);
            if (result.success) {
                setCollectionToDelete(null);
                setDeleteModalOpen(false);
                toast.success('Collection deleted successfully');
            } else {
                toast.error(result.message);
                setDeleteModalOpen(false);
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Collections</h1>
                    <p className="text-gray-500 mt-1">Shared adventures & albums.</p>
                    {/* Visual Debug Removed */}
                </div>

                {/* Join Code Input */}
                <form onSubmit={handleJoin} className="flex items-center gap-2">
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Enter Invite Code"
                            value={joinCode}
                            onChange={(e) => {
                                setJoinCode(e.target.value.toUpperCase());
                                setJoinError('');
                            }}
                            className={`pl-9 pr-4 py-2 bg-white border ${joinError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:border-black w-48 uppercase font-mono placeholder:normal-case placeholder:text-xs`}
                            maxLength={6}
                        />
                    </div>
                    <button type="submit" disabled={joinCode.length < 6} className="btn-primary py-2 px-4 h-[38px] disabled:opacity-50">Join</button>
                </form>
            </div>

            {/* My Collections Section */}
            <div className="mb-10">
                {joinedByMe.length > 0 && <h2 className="text-lg font-semibold text-gray-900 mb-4">My Collections</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-black hover:bg-gray-50 transition-all group h-48"
                    >
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
                            <Plus size={24} />
                        </div>
                        <h3 className="font-semibold text-gray-900">New Collection</h3>
                        <p className="text-xs text-gray-500 mt-1">Create a shared album</p>
                    </button>

                    {/* My Collections Grid */}
                    {createdByMe.map(collection => {
                        const count = photos.filter(p => p.collectionId === collection.id).length;
                        const isJoined = collection.created_by !== currentUser?.id;

                        return (
                            <div
                                key={collection.id}
                                className="card p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-48 flex flex-col group"
                                onClick={() => navigate(`/galleriq/collections/${collection.id}`)}
                            >
                                <div className="h-28 bg-gray-100 relative group/card">
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                        {collection.cover ? (
                                            <img src={collection.cover} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm">No Cover</span>
                                        )}
                                    </div>

                                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded">
                                        {collection.join_code}
                                    </div>

                                    {/* Joined Badge */}
                                    {isJoined && (
                                        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                                            Joined
                                        </div>
                                    )}

                                    {/* Delete button only for created collections */}
                                    {!isJoined && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete(collection);
                                            }}
                                            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                            title="Delete Collection"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center">
                                    <h3 className="font-semibold text-gray-900 truncate">{collection.name}</h3>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-500">{count} items</span>
                                        <ArrowRight size={16} className="text-gray-300 transform translate-x-0 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Shared With Me Section */}
            {joinedByMe.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Shared with Me</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {joinedByMe.map(collection => {
                            const count = photos.filter(p => p.collectionId === collection.id).length;
                            return (
                                <div
                                    key={collection.id}
                                    className="card p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-48 flex flex-col group"
                                    onClick={() => navigate(`/galleriq/collections/${collection.id}`)}
                                >
                                    <div className="h-28 bg-gray-100 relative group/card">
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                            {collection.cover ? (
                                                <img src={collection.cover} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm">No Cover</span>
                                            )}
                                        </div>

                                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded">
                                            {collection.code}
                                        </div>
                                        {/* No Delete Button for Joined Collections */}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        <h3 className="font-semibold text-gray-900 truncate">{collection.name}</h3>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-gray-500">{count} items</span>
                                            <ArrowRight size={16} className="text-gray-300 transform translate-x-0 group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Collection Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-4">Name your collection</h3>
                        <form onSubmit={handleCreate}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Summer Trip 2025"
                                className="input-field mb-4"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">Cancel</button>
                                <button type="submit" disabled={!newCollectionName.trim()} className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={executeDelete}
                title="Permanently Delete?"
                message={`Are you sure you want to delete "${collectionToDelete?.name}"? Using this action will PERMANENTLY delete the collection AND all photos inside it. This cannot be undone.`}
            />
        </div>
    );
};

export default CollectionsPage;
