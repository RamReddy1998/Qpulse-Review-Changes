import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readinessService } from '../../services/readiness.service';
import { practiceService } from '../../services/practice.service';
import { mockTestService } from '../../services/mocktest.service';
import { certificationService } from '../../services/certification.service';
import { MistakeLog, AiExplanation, MockTestHistoryItem, Certification } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertTriangle, RotateCcw, BookOpen, ChevronDown, ChevronUp, CheckCircle, Brain, Target, Award, ArrowLeft, ChevronRight } from 'lucide-react';

type ListView = 'all' | 'mock-tests' | 'certifications';
type ActiveDetail = null | { type: 'mock-test'; id: string; name: string } | { type: 'certification'; id: string; name: string };

export function MistakeAnalysis() {
  const [mistakes, setMistakes] = useState<MistakeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, AiExplanation>>({});
  const [loadingExp, setLoadingExp] = useState<string | null>(null);
  
  // New States
  const [currentView, setCurrentView] = useState<ListView>('all');
  const [activeDetail, setActiveDetail] = useState<ActiveDetail>(null);
  const [mockTests, setMockTests] = useState<MockTestHistoryItem[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [mockTestMistakes, setMockTestMistakes] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [mistakesData, certsData, mocksData] = await Promise.all([
        readinessService.getMistakes(page, 20),
        certificationService.getAll(),
        mockTestService.getHistory(1, 100), // Get a larger set for history context
      ]);
      setMistakes(mistakesData.data);
      setTotal(mistakesData.pagination.total);
      setCertifications(certsData);
      setMockTests(mocksData.data as MockTestHistoryItem[]);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const loadExplanation = async (questionId: string) => {
    if (explanations[questionId]) return;
    setLoadingExp(questionId);
    try {
      const exp = await practiceService.getExplanation(questionId);
      setExplanations((prev) => ({ ...prev, [questionId]: exp }));
    } catch (err) {
      console.error('Failed to load explanation:', err);
    } finally {
      setLoadingExp(null);
    }
  };

  const handlePracticeQuestion = (questionId: string, certificationId: string) => {
    navigate(`/practice?questionId=${questionId}&certId=${certificationId}`);
  };

  const loadMockTestMistakes = async (mockTestId: string, mockName: string) => {
    setLoadingDetail(true);
    setActiveDetail({ type: 'mock-test', id: mockTestId, name: mockName });
    setCurrentView('mock-tests');
    setExpandedId(null);
    try {
      const detail = await mockTestService.getResult(mockTestId);
      // Filter for incorrect attempts
      const mistakes = detail.attempts.filter(a => !a.isCorrect && a.userAnswer !== '');
      setMockTestMistakes(mistakes);
    } catch (err) {
      console.error('Failed to load mock test mistakes:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadCertificationMocks = (certId: string, certName: string) => {
    setActiveDetail({ type: 'certification', id: certId, name: certName });
    setCurrentView('certifications');
  };

  // Helper arrays
  const uniqueAttemptedCerts = new Set(mockTests.filter(m => m.certification).map(m => m.certification?.name)).size;
  const filteredMocks = activeDetail?.type === 'certification' 
    ? mockTests.filter(m => m.certification?.name === activeDetail.name)
    : mockTests;

  if (loading && page === 1) return <LoadingSpinner message="Loading mistake analysis..." />;

  const repeatedMistakes = mistakes.filter((m) => m.mistakeCount > 1).length;
  const topicsAffected = new Set(mistakes.map((m) => m.question.topic)).size;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mistake Analysis</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track and review your incorrect answers to improve</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          onClick={() => { setCurrentView('all'); setActiveDetail(null); }}
          className={`card group cursor-pointer transition-all duration-300 ${
            currentView === 'all' && !activeDetail 
              ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-900/10' 
              : 'hover:shadow-lg hover:scale-[1.02] hover:border-primary-300 dark:hover:border-primary-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${
                currentView === 'all' && !activeDetail ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${currentView === 'all' && !activeDetail ? 'text-primary-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All Mistakes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              </div>
            </div>
            <ChevronRight className={`h-5 w-5 transition-all group-hover:translate-x-1 ${
              currentView === 'all' && !activeDetail ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
            }`} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <RotateCcw className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Repeated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{repeatedMistakes}</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => { setCurrentView('mock-tests'); setActiveDetail(null); }}
          className={`card group cursor-pointer transition-all duration-300 ${
            currentView === 'mock-tests' && !activeDetail 
              ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-900/10' 
              : 'hover:shadow-lg hover:scale-[1.02] hover:border-primary-300 dark:hover:border-primary-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${
                currentView === 'mock-tests' && !activeDetail ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <Target className={`h-6 w-6 ${currentView === 'mock-tests' && !activeDetail ? 'text-primary-500' : 'text-blue-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mock Tests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockTests.length}</p>
              </div>
            </div>
            <ChevronRight className={`h-5 w-5 transition-all group-hover:translate-x-1 ${
              currentView === 'mock-tests' && !activeDetail ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
            }`} />
          </div>
        </div>

        <div 
          onClick={() => { setCurrentView('certifications'); setActiveDetail(null); }}
          className={`card group cursor-pointer transition-all duration-300 ${
            currentView === 'certifications' && !activeDetail 
              ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-900/10' 
              : 'hover:shadow-lg hover:scale-[1.02] hover:border-primary-300 dark:hover:border-primary-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${
                currentView === 'certifications' && !activeDetail ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-purple-50 dark:bg-purple-900/20'
              }`}>
                <Award className={`h-6 w-6 ${currentView === 'certifications' && !activeDetail ? 'text-primary-500' : 'text-purple-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Certifications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{uniqueAttemptedCerts}</p>
              </div>
            </div>
            <ChevronRight className={`h-5 w-5 transition-all group-hover:translate-x-1 ${
              currentView === 'certifications' && !activeDetail ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Navigation Breadcrumbs for details */}
      {activeDetail && (
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => {
              if (activeDetail.type === 'mock-test' && currentView === 'mock-tests') {
                setActiveDetail(null); // Go back to mock tests list
              } else if (activeDetail.type === 'mock-test' && currentView === 'certifications') {
                // Not supported currently, but fallback to clear
                setActiveDetail(null); 
              } else if (activeDetail.type === 'certification') {
                setActiveDetail(null);
                setCurrentView('certifications');
              } else {
                setActiveDetail(null);
              }
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {activeDetail.type === 'mock-test' ? 'Mock Tests' : 'Certifications'}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {activeDetail.type === 'mock-test' ? 'Mock Test: ' : 'Certification: '} {activeDetail.name}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {currentView === 'mock-tests' && !activeDetail && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attempted Mock Tests</h3>
          {mockTests.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 dark:text-gray-400">No mock tests attempted yet.</div>
          ) : (
            mockTests.map((test) => (
              <div 
                key={test.id} 
                onClick={() => loadMockTestMistakes(test.id, test.mockName)}
                className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{test.mockName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {test.certification?.name}
                    <span className="inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'In progress'}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{test.totalScore.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">score</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'certifications' && !activeDetail && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Practiced Certifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.filter(c => mockTests.some(m => m.certification?.name === c.name)).map(cert => (
              <div 
                key={cert.id}
                onClick={() => loadCertificationMocks(cert.id, cert.name)}
                className="card cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{cert.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {mockTests.filter(m => m.certification?.name === cert.name).length} mock tests
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
            {certifications.filter(c => mockTests.some(m => m.certification?.name === c.name)).length === 0 && (
              <div className="col-span-full card text-center py-8 text-gray-500 dark:text-gray-400">No certifications practiced via mock tests yet.</div>
            )}
          </div>
        </div>
      )}

      {currentView === 'certifications' && activeDetail?.type === 'certification' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mock Tests for {activeDetail.name}</h3>
          {filteredMocks.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 dark:text-gray-400">No mock tests found for this certification.</div>
          ) : (
            filteredMocks.map((test) => (
              <div 
                key={test.id} 
                onClick={() => {
                  // Keep current view as certifications, but update active detail to mock test
                  loadMockTestMistakes(test.id, test.mockName);
                  setCurrentView('certifications'); // preserve the hierarchy if we want to go back
                }}
                className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{test.mockName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'In progress'}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{test.totalScore.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">score</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Mock Test Detail / Specific Mistakes */}
      {activeDetail?.type === 'mock-test' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mistakes from {activeDetail.name}</h3>
          {loadingDetail ? (
             <LoadingSpinner message="Loading mock test details..." />
          ) : mockTestMistakes.length === 0 ? (
            <div className="card text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <p>Great job! No mistakes found in this mock test.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockTestMistakes.map((mistakeAttempt, idx) => (
                <div key={mistakeAttempt.questionId} className="card border-l-4 border-l-red-500">
                  <div 
                    onClick={() => {
                      toggleExpand(mistakeAttempt.questionId);
                      if (expandedId !== mistakeAttempt.questionId) loadExplanation(mistakeAttempt.questionId);
                    }}
                    className="flex justify-between items-start cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                          {mistakeAttempt.questionText}
                        </p>
                        <div className="flex items-center gap-2 text-xs mt-2">
                          <span className="badge-info">{mistakeAttempt.topic}</span>
                        </div>
                      </div>
                    </div>
                    {expandedId === mistakeAttempt.questionId ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  </div>

                  {expandedId === mistakeAttempt.questionId && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ml-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400 block mb-1">Your Answer:</span>
                          <span className="text-sm text-red-900 dark:text-red-300">
                            {mistakeAttempt.userAnswer}: {mistakeAttempt.options[mistakeAttempt.userAnswer as keyof typeof mistakeAttempt.options]}
                          </span>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400 block mb-1">Correct Answer:</span>
                          <span className="text-sm text-green-900 dark:text-green-300">
                            {mistakeAttempt.correctAnswer}: {mistakeAttempt.options[mistakeAttempt.correctAnswer as keyof typeof mistakeAttempt.options]}
                          </span>
                        </div>
                      </div>

                      {loadingExp === mistakeAttempt.questionId ? (
                        <LoadingSpinner message="Loading explanation..." />
                      ) : explanations[mistakeAttempt.questionId] && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                            <Brain className="h-4 w-4" /> AI Explanation
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{explanations[mistakeAttempt.questionId].stepByStep}</p>
                        </div>
                      )}

                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Need to know cert ID for this question. It's not in the attempt directly, 
                          // but mockTests includes cert name inherently. In a real app we'd pass the actual certId, 
                          // here we can find it from the certifications list based on the name or use first available.
                          const testCertName = mockTests.find(m => m.id === activeDetail.id)?.certification?.name;
                          const certId = certifications.find(c => c.name === testCertName)?.id || certifications[0]?.id || '';
                          handlePracticeQuestion(mistakeAttempt.questionId, certId); 
                        }}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        <BookOpen className="h-4 w-4" /> Practice This Question
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legacy "All Mistakes" list */}
      {currentView === 'all' && !activeDetail && (
        <>
          {mistakes.length === 0 ? (
        <div className="card text-center py-12 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No mistakes recorded yet. Start practicing to track your progress!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map((mistake) => (
            <div key={mistake.id} className="card cursor-pointer hover:shadow-md transition-shadow">
              <div
                onClick={() => {
                  toggleExpand(mistake.id);
                  if (expandedId !== mistake.id) loadExplanation(mistake.question.id);
                }}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                    {mistake.question.questionText}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge-info">{mistake.question.topic}</span>
                    <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{mistake.question.difficulty}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {mistake.question.certification?.name}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div>
                    <div className={`text-lg font-bold ${
                      mistake.mistakeCount >= 3 ? 'text-red-600' : mistake.mistakeCount >= 2 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {mistake.mistakeCount}x
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">mistakes</p>
                  </div>
                  {expandedId === mistake.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === mistake.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Correct answer */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Correct Answer
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Option {mistake.question.correctAnswer}: {mistake.question.options[mistake.question.correctAnswer as keyof typeof mistake.question.options]}
                    </p>
                  </div>

                  {/* All Options */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">All Options</h4>
                    <div className="space-y-1">
                      {Object.entries(mistake.question.options).map(([key, val]) => (
                        <div
                          key={key}
                          className={`text-sm p-2 rounded ${
                            key === mistake.question.correctAnswer
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span className="font-medium">{key}:</span> {val}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Explanation */}
                  {loadingExp === mistake.question.id ? (
                    <LoadingSpinner message="Loading explanation..." />
                  ) : explanations[mistake.question.id] && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <Brain className="h-4 w-4" /> AI Explanation
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{explanations[mistake.question.id].stepByStep}</p>
                    </div>
                  )}

                  {/* Practice button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePracticeQuestion(mistake.question.id, mistake.question.certificationId); }}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" /> Practice This Question
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="btn-secondary text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
