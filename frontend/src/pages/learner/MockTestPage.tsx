import { useEffect, useState, useCallback, useRef } from 'react';
import { certificationService } from '../../services/certification.service';
import { mockTestService } from '../../services/mocktest.service';
import { practiceService } from '../../services/practice.service';
import { Certification, Question, MockTestResult } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, XCircle, Minus, AlertTriangle, Check, Search, Filter, Settings, Info } from 'lucide-react';

type TestState = 'select' | 'config' | 'active' | 'result' | 'history';
type ResultTab = 'all' | 'correct' | 'wrong' | 'unattempted';

interface AnswerMap {
  [questionId: string]: { answer: string; timeSpent: number };
}

interface ResultQuestion {
  question: Question;
  userAnswer: string;
  userAnswerText: string;
  correctAnswer: string;
  correctAnswerText: string;
  isCorrect: boolean;
  status: 'correct' | 'wrong' | 'unattempted';
}

export function MockTestPage() {
  const [testState, setTestState] = useState<TestState>('select');
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedCertId, setSelectedCertId] = useState('');
  const [questionCount, setQuestionCount] = useState(30);
  const [mockName, setMockName] = useState('');
  const [mockNameError, setMockNameError] = useState('');
  const [mockTestId, setMockTestId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<MockTestResult | null>(null);
  const [resultQuestions, setResultQuestions] = useState<ResultQuestion[]>([]);
  const [resultTab, setResultTab] = useState<ResultTab>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; mockName: string; totalScore: number; startedAt: string; completedAt: string | null; certification?: { name: string }; certificationName?: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    Promise.all([
      certificationService.getAll(),
      mockTestService.getHistory(1, 10),
    ]).then(([certs, hist]) => {
      setCertifications(certs);
      setHistory(hist.data as typeof history);
      setLoading(false);
    });
  }, []);

  // Timer
  useEffect(() => {
    if (testState === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState]);

  // Fetch topics and difficulties when certification is selected
  useEffect(() => {
    if (selectedCertId && testState === 'config') {
      Promise.all([
        certificationService.getTopics(selectedCertId),
        certificationService.getDifficulties(selectedCertId),
      ]).then(([topics, diffs]) => {
        setAvailableTopics(topics);
        setAvailableDifficulties(diffs);
        setSelectedTopics(topics); // Default to all selected
        setSelectedDifficulties(diffs); // Default to all selected
      });
    }
  }, [selectedCertId, testState]);

  // Fetch live availability count
  useEffect(() => {
    if (selectedCertId && testState === 'config') {
      practiceService.getFilterCount(selectedCertId, {
        topic: selectedTopics,
        difficulty: selectedDifficulties
      }).then(setAvailableCount);
    }
  }, [selectedCertId, testState, selectedTopics, selectedDifficulties]);

  const handleStartTest = async () => {
    // Validate mock name
    if (!mockName.trim()) {
      setMockNameError('Please enter a name for this mock test');
      return;
    }
    setMockNameError('');
    setLoading(true);
    try {
      const testName = mockName.trim();
      const test = await mockTestService.start(selectedCertId, questionCount, selectedTopics, selectedDifficulties, testName);
      setMockTestId(test.mockTestId);
      setQuestions(test.questions);
      setTimeLeft(test.questions.length * 90); // 90 seconds per question
      setCurrentIdx(0);
      setAnswers({});
      questionStartRef.current = Date.now();
      setTestState('active');
    } catch (err) {
      console.error('Failed to start test:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answer: string) => {
    const qId = questions[currentIdx].id;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setAnswers((prev) => ({
      ...prev,
      [qId]: { answer, timeSpent: (prev[qId]?.timeSpent || 0) + timeSpent },
    }));
    questionStartRef.current = Date.now();
  };

  const handleSubmitTest = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      userAnswer: answers[q.id]?.answer || '',
      timeSpentSec: answers[q.id]?.timeSpent || 0,
    }));

    try {
      const res = await mockTestService.submit(mockTestId, formattedAnswers);
      setResult(res);

      // Load full results (includes correct answers + topic) for the grid
      try {
        const detail = await mockTestService.getResult(mockTestId);
        const questionMetaById = new Map(questions.map((q) => [q.id, q]));

        const rqs: ResultQuestion[] = detail.attempts.map((a) => {
          const meta = questionMetaById.get(a.questionId);
          const opts = a.options as unknown as Record<string, string>;
          const userAns = a.userAnswer || '';
          const correct = a.correctAnswer || '';

          const status: 'correct' | 'wrong' | 'unattempted' =
            userAns === '' ? 'unattempted' : a.isCorrect ? 'correct' : 'wrong';

          return {
            question: {
              id: a.questionId,
              questionText: a.questionText,
              options: a.options,
              difficulty: meta?.difficulty || 'unknown',
              topic: a.topic || meta?.topic || 'unknown',
              certificationId: selectedCertId,
            },
            userAnswer: userAns,
            userAnswerText: userAns ? `${userAns}: ${opts[userAns] || ''}` : '',
            correctAnswer: correct,
            correctAnswerText: correct ? `${correct}: ${opts[correct] || ''}` : '',
            isCorrect: userAns !== '' && a.isCorrect,
            status,
          };
        });

        setResultQuestions(rqs);
      } catch (e) {
        console.error('Failed to load detailed mock test results:', e);
        setResultQuestions([]);
      }

      setResultTab('all');
      setTestState('result');
    } catch (err) {
      console.error('Failed to submit test:', err);
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions, mockTestId, submitting]);

  const handleAutoSubmit = useCallback(() => {
    handleSubmitTest();
  }, [handleSubmitTest]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDurationString = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return '';
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  // Certification selection
  if (testState === 'select') {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mock Tests</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Simulate real exam conditions</p>
          </div>
          <button onClick={() => setTestState('history')} className="btn-secondary">
            View History
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert) => (
            <button
              key={cert.id}
              onClick={() => { setSelectedCertId(cert.id); setTestState('config'); }}
              className="card hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cert._count.questions} questions available</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Test configuration
  if (testState === 'config') {
    const cert = certifications.find((c) => c.id === selectedCertId);
    const maxQ = Math.min(cert?._count.questions || 30, 100);

    const toggleAllTopics = (select: boolean) => {
      setSelectedTopics(select ? availableTopics : []);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Modals */}
        {showTopicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Topics</h3>
                  <p className="text-sm text-gray-500">{selectedTopics.length} of {availableTopics.length} selected</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => toggleAllTopics(true)} className="text-xs font-bold text-orange-600">Select All</button>
                  <button onClick={() => toggleAllTopics(false)} className="text-xs font-bold text-gray-400">Clear</button>
                  <button onClick={() => setShowTopicModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ml-2">
                    <XCircle className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
                {availableTopics.map(topic => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopics(prev => isSelected ? prev.filter(t => t !== topic) : [...prev, topic])}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50/50 dark:border-orange-800/50' 
                          : 'border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{topic}</span>
                    </button>
                  );
                })}
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button onClick={() => setShowTopicModal(false)} className="btn-primary w-full py-3 !bg-orange-600 hover:!bg-orange-700 shadow-lg shadow-orange-500/20">Done</button>
              </div>
            </div>
          </div>
        )}

        {showDifficultyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Difficulty</h3>
                <button onClick={() => setShowDifficultyModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                {availableDifficulties.map(diff => {
                  const isSelected = selectedDifficulties.includes(diff);
                  return (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulties(prev => isSelected ? prev.filter(d => d !== diff) : [...prev, diff])}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      <span className="font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                      <div className={`w-3 h-3 rounded-full ${diff.toLowerCase() === 'easy' ? 'bg-green-500' : diff.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    </button>
                  );
                })}
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button onClick={() => setShowDifficultyModal(false)} className="btn-primary w-full py-3 !bg-orange-600 hover:!bg-orange-700 shadow-lg shadow-orange-500/20">Done</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configure Mock Test</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></div>
              {cert?.name}
            </p>
          </div>
          <button onClick={() => setTestState('select')} className="btn-secondary flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Change Certification
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card shadow-sm border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white font-semibold">
                <Settings className="h-5 w-5 text-primary-500" />
                General Settings
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mock Test Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={mockName}
                    onChange={(e) => { setMockName(e.target.value); setMockNameError(''); }}
                    placeholder="e.g., My Mock Test - Week 1"
                    className={`input-field w-full ${mockNameError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  />
                  {mockNameError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{mockNameError}</p>
                  )}
                </div>

                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Questions</label>
                    <div className="flex items-center gap-2">
                      {availableCount !== null && (
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                           availableCount >= questionCount ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                         }`}>
                           {availableCount} available
                         </span>
                      )}
                      <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-sm font-bold">
                        {questionCount} Questions
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={Math.min(5, availableCount || 5)}
                    max={Math.min(maxQ, availableCount || maxQ)}
                    value={Math.min(questionCount, availableCount || questionCount)}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>min: 5</span>
                    <span>max: {availableCount !== null ? Math.min(maxQ, availableCount) : maxQ}</span>
                  </div>
                  {availableCount !== null && availableCount < questionCount && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-orange-700 dark:text-orange-300">
                        Only {availableCount} questions match your filters. The test will be limited to this amount.
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Structured Selection View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              <div className="card shadow-sm border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <Filter className="h-5 w-5 text-orange-500" />
                    Topics
                  </div>
                  <button onClick={() => setShowTopicModal(true)} className="text-xs font-bold text-orange-600 hover:underline">Manage</button>
                </div>
                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden flex flex-col">
                   {selectedTopics.length === availableTopics.length ? (
                     <div className="text-sm font-bold text-green-600 mb-2">All topics selected</div>
                   ) : selectedTopics.length > 0 ? (
                     <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {selectedTopics.slice(0, 6).map(t => (
                          <span key={t} className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                            {t}
                          </span>
                        ))}
                        {selectedTopics.length > 6 && (
                          <span className="text-[10px] font-bold text-orange-600 ml-1">+{selectedTopics.length - 6} more</span>
                        )}
                     </div>
                   ) : (
                     <div className="text-sm font-bold text-red-500 mb-2">No topics selected</div>
                   )}
                   <p className="text-[10px] text-gray-400 mt-auto">Focus your practice session.</p>
                </div>
              </div>

              <div className="card shadow-sm border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Difficulty
                  </div>
                  <button onClick={() => setShowDifficultyModal(true)} className="text-xs font-bold text-orange-600 hover:underline">Manage</button>
                </div>
                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex flex-col">
                   {selectedDifficulties.length === availableDifficulties.length ? (
                     <div className="text-sm font-bold text-green-600 mb-2">All levels selected</div>
                   ) : selectedDifficulties.length > 0 ? (
                     <div className="flex flex-wrap gap-2 mb-2">
                        {selectedDifficulties.map(d => (
                          <span key={d} className="flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[10px] font-bold text-orange-600 capitalize">
                            <div className={`w-1.5 h-1.5 rounded-full ${d.toLowerCase() === 'easy' ? 'bg-green-500' : d.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                            {d}
                          </span>
                        ))}
                     </div>
                   ) : (
                     <div className="text-sm font-bold text-red-500 mb-2">No levels selected</div>
                   )}
                   <p className="text-[10px] text-gray-400 mt-auto">Adjust the challenge level.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Config */}
          <div className="space-y-6">
            <div className="card bg-gray-50 dark:bg-gray-800/50 border-dashed border-2 border-gray-200 dark:border-gray-700">
               <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white font-semibold">
                <Info className="h-5 w-5 text-primary-500" />
                Test Summary
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Questions</span>
                  <span className="text-gray-900 dark:text-white font-medium">{questionCount}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Topics</span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">{selectedTopics.length} selected</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Time Limit</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formatTime(questionCount * 90)}</span>
                </div>
              </div>
              <hr className="my-4 border-gray-200 dark:border-gray-700" />
              <button 
                onClick={handleStartTest} 
                disabled={selectedTopics.length === 0 || selectedDifficulties.length === 0}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 !bg-orange-600 hover:!bg-orange-700 shadow-lg shadow-orange-500/20"
              >
                Start Practice <ChevronRight className="h-4 w-4" />
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-3 italic">
                * Final score is based on correct answers. No negative marking.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  

  // Active test
  if (testState === 'active') {
    const currentQ = questions[currentIdx];
    const currentAnswer = answers[currentQ?.id]?.answer || '';

    return (
      <div>
        {/* Timer bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 -mx-8 -mt-8 px-8 py-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Question {currentIdx + 1}/{questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { questionStartRef.current = Date.now(); setCurrentIdx(i); }}
                    className={`w-7 h-7 rounded text-xs font-medium ${
                      i === currentIdx
                        ? 'bg-primary-600 text-white'
                        : answers[questions[i].id]
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                timeLeft < 300 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
              <button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="btn-danger flex items-center gap-2 text-sm"
              >
                <Flag className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Question */}
        {currentQ && (
          <div className="card max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge-info">{currentQ.topic}</span>
              <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{currentQ.difficulty}</span>
            </div>

            <p className="text-gray-900 dark:text-white font-medium mb-6 leading-relaxed whitespace-pre-line">
              {currentQ.questionText}
            </p>

            <div className="space-y-3 mb-6">
              {Object.entries(currentQ.options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleSelectAnswer(key)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    currentAnswer === key
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      currentAnswer === key
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => { questionStartRef.current = Date.now(); setCurrentIdx(Math.max(0, currentIdx - 1)); }}
                disabled={currentIdx === 0}
                className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => { questionStartRef.current = Date.now(); setCurrentIdx(currentIdx + 1); }}
                  className="btn-primary flex items-center gap-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={handleSubmitTest} disabled={submitting} className="btn-danger flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Finish Test
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }


  const filteredResultQuestions = resultQuestions.filter((rq) => resultTab === 'all' || rq.status === resultTab);

  // Result - split screen layout
  if (testState === 'result' && result) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Mock Test Results</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary */}
          <div className="card">
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${
                result.percentage >= 70 ? 'text-green-600' : result.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {result.percentage}%
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Score: {result.totalScore} / {result.totalQuestions}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setResultTab('correct')}
                className={`text-center p-3 rounded-lg cursor-pointer transition-all ${resultTab === 'correct' ? 'ring-2 ring-green-500' : ''} bg-green-50 dark:bg-green-900/20`}
              >
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{result.correct}</p>
                <p className="text-xs text-green-600">Correct</p>
              </button>
              <button
                onClick={() => setResultTab('wrong')}
                className={`text-center p-3 rounded-lg cursor-pointer transition-all ${resultTab === 'wrong' ? 'ring-2 ring-red-500' : ''} bg-red-50 dark:bg-red-900/20`}
              >
                <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{result.wrong}</p>
                <p className="text-xs text-red-600">Wrong</p>
              </button>
              <button
                onClick={() => setResultTab('unattempted')}
                className={`text-center p-3 rounded-lg cursor-pointer transition-all ${resultTab === 'unattempted' ? 'ring-2 ring-gray-500' : ''} bg-gray-50 dark:bg-gray-800`}
              >
                <Minus className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{result.unanswered}</p>
                <p className="text-xs text-gray-600">Unattempted</p>
              </button>
            </div>

            <button onClick={() => setResultTab('all')} className={`w-full text-center text-sm py-2 rounded-lg mb-4 ${resultTab === 'all' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              Show All
            </button>


            <div className="flex gap-2">
              <button onClick={() => setTestState('select')} className="btn-secondary flex-1 text-sm">Back</button>
              <button onClick={() => { setTestState('config'); setResultQuestions([]); setResultTab('all'); }} className="btn-primary flex-1 text-sm">Retake</button>
            </div>
          </div>

          {/* Right: Question grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Questions ({filteredResultQuestions.length})
              </h2>
              <div className="flex gap-1">
                {(['all', 'correct', 'wrong', 'unattempted'] as ResultTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      resultTab === tab
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredResultQuestions.map((rq, idx) => (
                <div key={rq.question.id} className={`card border-l-4 ${
                  rq.status === 'correct' ? 'border-l-green-500' : rq.status === 'wrong' ? 'border-l-red-500' : 'border-l-gray-400'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      rq.status === 'correct' ? 'bg-green-500' : rq.status === 'wrong' ? 'bg-red-500' : 'bg-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">{rq.question.questionText}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="badge-info">{rq.question.topic}</span>
                          <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{rq.question.difficulty}</span>
                        </div>
                        {rq.userAnswer ? (
                          <p className={`text-sm ${rq.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            <span className="font-medium">Your Answer:</span> {rq.userAnswerText}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Not attempted</p>
                        )}
                        <p className="text-sm text-green-700 dark:text-green-400">
                          <span className="font-medium">Correct Answer:</span> {rq.correctAnswerText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredResultQuestions.length === 0 && (
                <div className="text-center py-8 text-gray-400">No questions in this category</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // History
  if (testState === 'history') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test History</h1>
          <button onClick={() => setTestState('select')} className="btn-secondary">Back</button>
        </div>
        {history.length === 0 ? (
          <div className="card text-center py-12 text-gray-500 dark:text-gray-400">No mock tests taken yet.</div>
        ) : (
          <div className="space-y-3">
            {history.map((test) => (
              <div key={test.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{test.mockName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{test.certification?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-700 dark:text-primary-400">{test.totalScore}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {test.completedAt ? (
                      <>
                        {new Date(test.completedAt).toLocaleDateString()}
                        <span className="mx-1">•</span>
                        Time spent: {getDurationString(test.startedAt, test.completedAt)}
                      </>
                    ) : 'In progress'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
