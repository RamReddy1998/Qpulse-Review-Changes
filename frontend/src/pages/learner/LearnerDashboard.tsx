import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { certificationService } from '../../services/certification.service';
import { readinessService } from '../../services/readiness.service';
import { mockTestService } from '../../services/mocktest.service';
import { Certification, ReadinessHistory } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookOpen, Target, FileCheck, Clock, ChevronRight, Award, Trash2, Edit3 } from 'lucide-react';
import { useAuthStore } from '../../store/slices/authStore';
import { adminService } from '../../services/admin.service';

export function LearnerDashboard() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [readiness, setReadiness] = useState<ReadinessHistory | null>(null);
  const [mockCount, setMockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      loadDashboard();
    };
    init();
  }, []);

  const loadDashboard = async () => {
    try {
      // 1. Always try to load certifications
      try {
        const certs = await certificationService.getAll();
        setCertifications(certs);
      } catch (certErr) {
        console.error('Failed to load certifications:', certErr);
        setError('Failed to load certifications');
      }

      // 2. Load learner-specific data only if not admin or if available
      try {
        const [readinessData, mockHistory] = await Promise.all([
          readinessService.getLatest().catch(() => null),
          mockTestService.getHistory(1, 1).catch(() => ({ pagination: { total: 0 } })),
        ]);
        setReadiness(readinessData);
        setMockCount(mockHistory.pagination?.total || 0);
      } catch (dashErr) {
        console.warn('Could not load some dashboard metrics:', dashErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertification = async (e: React.MouseEvent, certId: string, certName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the certification "${certName}"? This will delete all associated questions, mock tests, and activity.`)) {
      return;
    }

    try {
      await adminService.deleteCertification(certId);
      setCertifications(certifications.filter(c => c.id !== certId));
    } catch (err) {
      console.error('Failed to delete certification:', err);
      setError('Failed to delete certification');
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const totalQuestions = certifications.reduce((sum, c) => sum + (c._count?.questions || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exam_ready': return 'text-green-600 bg-green-50';
      case 'almost_ready': return 'text-blue-600 bg-blue-50';
      case 'needs_improvement': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') ? 'Certification Management' : 'Learner Dashboard'}
          {(user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') && (
            <span className="px-3 py-1 bg-red-500 text-white text-[12px] rounded-full font-black uppercase shadow-lg animate-pulse">ADMIN ACCESS ENABLED</span>
          )}
        </h1>
        <p className="text-gray-500 mt-1">
          {(user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') ? 'Full administrative control over certifications' : 'Track your certification exam preparation progress'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Grid - Hide for Admin */}
      {user?.role?.toUpperCase() !== 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Certifications</p>
                <p className="text-2xl font-bold text-gray-900">{certifications.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Mock Tests</p>
                <p className="text-2xl font-bold text-gray-900">{mockCount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Readiness Score</p>
                <p className="text-2xl font-bold text-gray-900">{readiness?.score || 0}%</p>
              </div>
            </div>
            {readiness && (
              <span className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(readiness.status)}`}>
                {readiness.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Certifications */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Certifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert) => (
            <div key={cert.id} className={`card hover:shadow-md transition-all relative flex flex-col h-full overflow-hidden border-2 border-transparent ${user?.role === 'ADMIN' ? 'cursor-default' : 'cursor-pointer hover:border-primary-100 dark:hover:border-primary-900/30 group'}`}
                 onClick={() => user?.role !== 'ADMIN' && navigate(`/practice?certId=${cert.id}`)}>
              <div className="flex items-start justify-between flex-1">
                <div className="flex-1">
                  <h3 className={`font-bold text-gray-900 dark:text-white transition-colors text-lg ${user?.role !== 'ADMIN' ? 'group-hover:text-primary-600' : ''}`}>
                    {cert.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                    {cert.description}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      {cert._count.questions} Questions
                    </div>
                  </div>
                </div>
                {user?.role !== 'ADMIN' && (
                  <div className="flex items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                )}
              </div>

              {(user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/upload?mode=edit&certId=${cert.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 rounded-xl transition-all text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    EDIT
                  </button>
                  <button
                    onClick={(e) => handleDeleteCertification(e, cert.id, cert.name)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 rounded-xl transition-all text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    DELETE
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions - Hide for Admin */}
      {user?.role?.toUpperCase() !== 'ADMIN' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/practice')}
              className="card hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Practice</h3>
                  <p className="text-sm text-gray-500">Practice with AI explanations</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/mock-tests')}
              className="card hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Mock Test</h3>
                  <p className="text-sm text-gray-500">Timed exam simulation</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/readiness')}
              className="card hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Readiness Check</h3>
                  <p className="text-sm text-gray-500">See if you're exam-ready</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
