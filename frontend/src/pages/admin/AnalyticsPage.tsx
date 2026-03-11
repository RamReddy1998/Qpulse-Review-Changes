import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { LearnerAnalytics, User, Question, Batch } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { BarChart3, Clock, Target, BookOpen, AlertTriangle, ChevronDown, ChevronUp, Layers, CheckCircle, TrendingUp, Zap, Award, Users, ChevronRight } from 'lucide-react';

export function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');

  const [learners, setLearners] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(userIdParam || '');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchParticipants, setBatchParticipants] = useState<any[]>([]);
  const [loadingBatchData, setLoadingBatchData] = useState(false);
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<Record<string, Question[]>>({});
  const [loadingTopicQs, setLoadingTopicQs] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminService.getLearners(1, 100),
      adminService.getBatches(1, 50)
    ]).then(([learnerData, batchData]) => {
      setLearners(learnerData.data);
      setBatches(batchData.data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadAnalytics(selectedUserId);
    } else {
      setAnalytics(null);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchParticipants(selectedBatchId);
      setSelectedUserId(''); // Reset individual learner when batch is selected
    } else {
      setBatchParticipants([]);
    }
  }, [selectedBatchId]);

  const loadBatchParticipants = async (batchId: string) => {
    setLoadingBatchData(true);
    try {
      const data = await adminService.getBatchParticipantsAnalytics(batchId, 1, 100);
      setBatchParticipants(data.data);
    } catch (err) {
      console.error('Failed to load batch participants:', err);
    } finally {
      setLoadingBatchData(false);
    }
  };

  const loadAnalytics = async (userId: string) => {
    setLoadingAnalytics(true);
    try {
      const data = await adminService.getLearnerAnalytics(userId);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleToggleTopic = async (topic: string) => {
    if (expandedTopic === topic) {
      setExpandedTopic(null);
      return;
    }
    setExpandedTopic(topic);
    if (!topicQuestions[topic]) {
      setLoadingTopicQs(topic);
      try {
        const qs = await adminService.getWeaknessQuestions(topic);
        setTopicQuestions((prev) => ({ ...prev, [topic]: qs }));
      } catch (err) {
        console.error('Failed to load topic questions:', err);
      } finally {
        setLoadingTopicQs(null);
      }
    }
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learner Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed performance analytics per learner</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Learner</label>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setSelectedBatchId('');
            }}
            className="input-field"
          >
            <option value="">Choose a learner...</option>
            {learners.map((l) => (
              <option key={l.id} value={l.id}>{l.username}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or Select Batch</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a batch...</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.batchName}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingAnalytics ? (
        <LoadingSpinner message="Loading analytics..." />
      ) : analytics ? (
        <div>
          {/* Learner context: batch + certification */}
          <div className="card mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ff5f2d20' }}>
                  <span className="text-sm font-bold" style={{ color: '#ff5f2d' }}>
                    {analytics.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{analytics.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {analytics.learningType === 'BATCH' ? 'Batch Learner' : 'Self Learner'}
                  </p>
                </div>
              </div>
              {analytics.batches && analytics.batches.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-4">
                  {analytics.batches.map((b) => (
                    <div key={b.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" style={{ borderColor: '#ff5f2d40', backgroundColor: '#ff5f2d08' }}>
                      <Layers className="h-3.5 w-3.5" style={{ color: '#ff5f2d' }} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{b.batchName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({b.certificationName})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Time</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatTime(analytics.totalTimeSec)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.totalAttempts}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mock Tests</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.mockTestCount}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Readiness</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.readinessScore}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Engagement & Accuracy */}
          <div className="card shadow-sm border-blue-100/50 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Topic Engagement & Accuracy
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topicAccuracy.slice(0, 10)} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weak Topics - Clickable with question display */}
          {analytics.weakTopics.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Weakness Detection
              </h2>
              <div className="space-y-3">
                {analytics.weakTopics.map((topic, i) => (
                  <div key={i}>
                    <button
                      onClick={() => handleToggleTopic(topic.topic)}
                      className={`w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${expandedTopic === topic.topic ? 'rounded-b-none' : ''
                        }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">{topic.topic}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{topic.count} questions affected</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{topic.totalMistakes}</p>
                          <p className="text-xs text-red-500">total mistakes</p>
                        </div>
                        {expandedTopic === topic.topic ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {expandedTopic === topic.topic && (
                      <div className="border border-t-0 border-red-200 dark:border-red-800 rounded-b-lg p-3 space-y-2">
                        {loadingTopicQs === topic.topic ? (
                          <LoadingSpinner message="Loading questions..." />
                        ) : topicQuestions[topic.topic]?.length ? (
                          topicQuestions[topic.topic].map((q, qi) => (
                            <div key={q.id} className="p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                              <p className="text-gray-900 dark:text-white font-medium leading-relaxed">{qi + 1}. {q.questionText}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-[10px] uppercase font-bold tracking-tight">Focus Question</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-2">No questions found for this topic</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : selectedBatchId ? (
        loadingBatchData ? (
          <LoadingSpinner message="Loading batch data..." />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Batch Participants Progression
              </h2>
              <div className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {batchParticipants.length} Participants
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {batchParticipants
                .sort((a, b) => {
                  const scoreA = a.scoreRange === 'N/A' ? -1 : parseInt(a.scoreRange.split('-')[1]);
                  const scoreB = b.scoreRange === 'N/A' ? -1 : parseInt(b.scoreRange.split('-')[1]);
                  return scoreB - scoreA;
                })
                .map((p, rank) => (
                  <div key={p.id} className="card hover:shadow-xl transition-all border-l-4 border-l-primary-500 group relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs shadow-md">
                      #{rank + 1}
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-6">
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                          {p.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {p.username}
                            {rank === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                          </p>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${p.activityStatus === 'Active' ? 'text-green-500' : 'text-gray-400'
                            }`}>
                            {p.activityStatus}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-500">Readiness Score</span>
                          <span className="text-sm font-black text-primary-600 tracking-tighter transition-all group-hover:text-primary-500">{p.scoreRange}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border dark:border-gray-600">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-600 to-orange-400 rounded-full group-hover:brightness-110 transition-all shadow-[0_0_8px_rgba(255,95,45,0.4)]" 
                            style={{ width: p.scoreRange !== 'N/A' ? `${p.scoreRange.split('-')[1].replace('%', '')}%` : '0%' }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => setSelectedUserId(p.userId)}
                          className="btn-primary py-2 px-6 flex items-center gap-2 w-full md:w-auto justify-center hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                          <Zap className="h-4 w-4" /> Full Audit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-gray-50/20 dark:bg-gray-800/20 border-dashed border-2 rounded-2xl">
          <p className="text-gray-500 dark:text-gray-400">
            Select a learner or batch from the options above to view analytics.
          </p>
        </div>
      )}
    </div>
  );
}
