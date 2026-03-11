import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { certificationService } from '../../services/certification.service';
import { Batch, Certification } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Layers, Plus, UserPlus, X, ChevronRight } from 'lucide-react';

export function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchCertId, setNewBatchCertId] = useState('');
  const [newBatchStartTime, setNewBatchStartTime] = useState('');
  const [newBatchEndTime, setNewBatchEndTime] = useState('');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [addUsername, setAddUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchData, certs] = await Promise.all([
        adminService.getBatches(1, 50),
        certificationService.getAll(),
      ]);
      setBatches(batchData.data);
      setCertifications(certs);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await adminService.createBatch(
        newBatchName,
        newBatchCertId,
        newBatchStartTime || undefined,
        newBatchEndTime || undefined
      );
      setShowCreate(false);
      setNewBatchName('');
      setNewBatchCertId('');
      setNewBatchStartTime('');
      setNewBatchEndTime('');
      loadData();
      setMessage('Batch created successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setError('');
    try {
      await adminService.updateBatch(editingBatch.id, {
        batchName: newBatchName,
        certificationId: newBatchCertId,
        startTime: newBatchStartTime || undefined,
        endTime: newBatchEndTime || undefined,
      });
      setEditingBatch(null);
      setNewBatchName('');
      setNewBatchCertId('');
      setNewBatchStartTime('');
      setNewBatchEndTime('');
      loadData();
      setMessage('Batch updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update batch');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await adminService.deleteBatch(batchId);
      if (selectedBatch?.id === batchId) setSelectedBatch(null);
      loadData();
      setMessage('Batch deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to delete batch:', err);
      setError('Failed to delete batch');
    }
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatchName(batch.batchName);
    setNewBatchCertId(batch.certificationId);
    setNewBatchStartTime(batch.startTime ? new Date(batch.startTime).toISOString().split('T')[0] : '');
    setNewBatchEndTime(batch.endTime ? new Date(batch.endTime).toISOString().split('T')[0] : '');
  };


  const handleAddParticipant = async (batchId: string) => {
    if (!addUsername.trim()) return;
    setError('');
    try {
      await adminService.addParticipant(batchId, addUsername.trim());
      setAddUsername('');
      // Reload batch details
      const batch = await adminService.getBatchDetails(batchId);
      setSelectedBatch(batch);
      setMessage('Participant added');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to add participant');
    }
  };

  const handleRemoveParticipant = async (batchId: string, userId: string) => {
    try {
      await adminService.removeParticipant(batchId, userId);
      const batch = await adminService.getBatchDetails(batchId);
      setSelectedBatch(batch);
      setMessage('Participant removed');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  const handleSelectBatch = async (batchId: string) => {
    try {
      const batch = await adminService.getBatchDetails(batchId);
      setSelectedBatch(batch);
    } catch (err) {
      console.error('Failed to load batch:', err);
    }
  };

  if (loading) return <LoadingSpinner message="Loading batches..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage learner batches</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Batch
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Batch</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Batch 2024 - GCP ACE"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification</label>
                <select
                  value={newBatchCertId}
                  onChange={(e) => setNewBatchCertId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select certification</option>
                  {certifications.map((cert) => (
                    <option key={cert.id} value={cert.id}>{cert.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newBatchStartTime}
                    onChange={(e) => setNewBatchStartTime(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newBatchEndTime}
                    onChange={(e) => setNewBatchEndTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Batch</h2>
            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Batch 2024 - GCP ACE"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification</label>
                <select
                  value={newBatchCertId}
                  onChange={(e) => setNewBatchCertId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select certification</option>
                  {certifications.map((cert) => (
                    <option key={cert.id} value={cert.id}>{cert.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newBatchStartTime}
                    onChange={(e) => setNewBatchStartTime(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newBatchEndTime}
                    onChange={(e) => setNewBatchEndTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingBatch(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch List */}
        <div className="space-y-3">
          {batches.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <Layers className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No batches created yet</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                className={`card w-full p-0 overflow-hidden hover:shadow-md transition-shadow ${
                  selectedBatch?.id === batch.id ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <button
                  onClick={() => handleSelectBatch(batch.id)}
                  className="w-full text-left p-4 focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{batch.batchName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{batch.certification.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {batch._count?.participants || 0} participants
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
                <div className="flex border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <button
                    onClick={() => openEditModal(batch)}
                    className="flex-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-r border-gray-100 dark:border-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Batch Details */}
        <div className="lg:col-span-2">
          {selectedBatch ? (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{selectedBatch.batchName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedBatch.certification.name}</p>

              {/* Add participant */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Enter learner username"
                  className="input-field flex-1"
                />
                <button
                  onClick={() => handleAddParticipant(selectedBatch.id)}
                  className="btn-primary flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Add
                </button>
              </div>

              {/* Participants */}
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Participants ({selectedBatch.participants?.length || 0})
              </h3>
              {!selectedBatch.participants?.length ? (
                <p className="text-sm text-gray-500">No participants yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedBatch.participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-700">
                            {p.user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{p.user.username}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveParticipant(selectedBatch.id, p.user.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <Layers className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p>Select a batch to view details</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
