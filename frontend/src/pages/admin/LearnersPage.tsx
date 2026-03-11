import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { User } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Users, BarChart3 } from 'lucide-react';

export function LearnersPage() {
  const [learners, setLearners] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLearners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadLearners = async () => {
    setLoading(true);
    try {
      const data = await adminService.getLearners(page, 20);
      setLearners(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to load learners:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && page === 1) return <LoadingSpinner message="Loading learners..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learner Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} total learners</p>
        </div>
      </div>

      {learners.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No learners registered yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Username</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Learning Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Batch</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {learners.map((learner) => (
                <tr key={learner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                          {learner.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{learner.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      learner.learningType === 'BATCH'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {learner.learningType === 'BATCH' ? 'Batch Learner' : 'Self Learner'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {learner.batchParticipants && learner.batchParticipants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {learner.batchParticipants.map((bp) => (
                          <span
                            key={bp.batch.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: '#ff5f2d20', color: '#ff5f2d' }}
                          >
                            {bp.batch.batchName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {learner.createdAt ? new Date(learner.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/analytics?userId=${learner.id}`)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1 ml-auto"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-sm">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-sm">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
