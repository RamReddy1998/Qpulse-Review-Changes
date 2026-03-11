import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { AdminDashboard as AdminDashboardType } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Users, UserCheck, Target, FileCheck, Calendar, BookOpen, Layers, X, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchParticipants, setBatchParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  useEffect(() => {
    adminService
      .getDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navigate = useNavigate();
  const handleBatchClick = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setLoadingParticipants(true);
    setShowBatchModal(true);
    try {
      const data = await adminService.getBatchParticipantsAnalytics(batchId, 1, 100);
      setBatchParticipants(data.data);
    } catch (err) {
      console.error('Failed to load batch participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading admin dashboard..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Learners</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.totalLearners || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Learners (7d)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.activeLearners || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ff5f2d20' }}>
              <Target className="h-6 w-6" style={{ color: '#ff5f2d' }} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Readiness</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.avgReadiness || 0}%</p>
            </div>
          </div>
        </div>
      </div>




      {/* Batch Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Current Month Batches */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5" style={{ color: '#ff5f2d' }} />
            Current / Active Batches
          </h2>
          {dashboard?.currentMonthBatches && dashboard.currentMonthBatches.length > 0 ? (
            <div className="space-y-3">
              {dashboard.currentMonthBatches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => handleBatchClick(batch.id)}
                  className="flex w-full items-center justify-between p-3 rounded-lg border text-left hover:shadow-md transition-shadow group"
                  style={{ backgroundColor: '#ff5f2d10', borderColor: '#ff5f2d40' }}
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{batch.batchName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {batch.certificationName} &bull; End: {batch.endTime ? new Date(batch.endTime).toLocaleDateString() : 'Continuous'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: '#ff5f2d' }} />
                      <span className="text-sm font-medium" style={{ color: '#ff5f2d' }}>{batch.participantCount}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No active batches</p>
          )}
        </div>

        {/* Next Month Batches */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Upcoming Batches
          </h2>
          {dashboard?.nextMonthBatches && dashboard.nextMonthBatches.length > 0 ? (
            <div className="space-y-3">
              {dashboard.nextMonthBatches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => handleBatchClick(batch.id)}
                  className="flex w-full items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 text-left hover:shadow-md transition-shadow group"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{batch.batchName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {batch.certificationName} &bull; Start: {batch.startTime ? new Date(batch.startTime).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">{batch.participantCount}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No upcoming batches</p>
          )}
        </div>

        {/* Completed Batches */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-green-600" />
            Completed Batches
          </h2>
          {dashboard?.completedBatches && dashboard.completedBatches.length > 0 ? (
            <div className="space-y-3">
              {dashboard.completedBatches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => handleBatchClick(batch.id)}
                  className="flex w-full items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 text-left hover:shadow-md transition-shadow group opacity-75 hover:opacity-100"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">{batch.batchName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {batch.certificationName} &bull; Ended: {batch.endTime ? new Date(batch.endTime).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">{batch.participantCount}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No completed batches yet</p>
          )}
        </div>
      </div>

      {/* Batch Participants Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Batch Participants</h2>
              <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingParticipants ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner message="Loading participants..." />
                </div>
              ) : batchParticipants.length > 0 ? (
                <div className="space-y-4">
                  {batchParticipants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="font-bold text-primary-700">{p.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{p.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Readiness: {p.scoreRange}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.activityStatus === 'Active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {p.activityStatus}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No participants in this batch yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
