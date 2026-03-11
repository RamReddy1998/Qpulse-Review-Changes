import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { certificationService } from '../../services/certification.service';
import { practiceService } from '../../services/practice.service';
import { Certification, Question, AiExplanation, AiHint } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BookOpen, ChevronRight, ChevronLeft, Lightbulb, CheckCircle, XCircle,
  RotateCcw, Brain, Filter, X, HelpCircle, Link as LinkIcon, Zap, Check
} from 'lucide-react';

export function SmartPractice() {
  const [searchParams] = useSearchParams();
  const certIdParam = searchParams.get('certId');
  const questionIdParam = searchParams.get('questionId');

  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedCertId, setSelectedCertId] = useState(certIdParam || '');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [goToNumber, setGoToNumber] = useState('');
  
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState<AiExplanation | null>(null);
  const [hint, setHint] = useState<AiHint | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [startTime, setStartTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [questionLimit, setQuestionLimit] = useState(20);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    certificationService.getAll().then((certs) => {
      setCertifications(certs);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCertId) {
      Promise.all([
        practiceService.getTopics(selectedCertId),
        practiceService.getDifficulties(selectedCertId),
        practiceService.getTotalCount(selectedCertId),
      ]).then(([t, d, total]) => {
        setTopics(t);
        setDifficulties(d);
        setTotalQuestions(total);
      });
      if (questionIdParam) {
        loadSpecificQuestion(questionIdParam);
      } else {
        loadQuestionByOffset(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCertId]);

  useEffect(() => {
    if (selectedCertId && (selectedTopic || selectedDifficulty)) {
      practiceService
        .getFilterCount(selectedCertId, {
          topic: selectedTopic || undefined,
          difficulty: selectedDifficulty || undefined,
        })
        .then(setFilterCount);
    } else {
      setFilterCount(0);
    }
  }, [selectedCertId, selectedTopic, selectedDifficulty]);

  const loadSpecificQuestion = async (questionId: string) => {
    setLoadingQuestion(true);
    try {
      const q = await practiceService.getQuestionById(questionId);
      setQuestions([q]);
      setCurrentIdx(0);
      setStartTime(Date.now());
    } catch (err) {
      console.error('Failed to load question:', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const loadQuestionByOffset = async (offset: number, explicitFilters?: { topic?: string, difficulty?: string }) => {
    if (!selectedCertId) return;
    setLoadingQuestion(true);
    setQuestions([]); // Clear stale data
    setError(null);
    resetQuestionState();
    try {
      const filters = explicitFilters || (filtersApplied ? {
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
      } : undefined);
      
      const q = await practiceService.getQuestionByOffset(selectedCertId, offset, filters);
      setQuestions([q]);
      setCurrentIdx(offset);
      setStartTime(Date.now());
    } catch (err: any) {
      console.error('Failed to load question:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to load question. Please try again.');
      }
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleGoTo = () => {
    const num = parseInt(goToNumber);
    if (!isNaN(num) && num >= 1 && num <= totalQuestions) {
      loadQuestionByOffset(num - 1);
      setGoToNumber('');
    }
  };

  const handleApplyFilters = async () => {
    if (!selectedCertId) return;
    setFiltersApplied(true);
    setShowFilters(false);
    loadQuestionByOffset(0, {
      topic: selectedTopic || undefined,
      difficulty: selectedDifficulty || undefined,
    });
  };

  const handleResetFilters = () => {
    setSelectedTopic('');
    setSelectedDifficulty('');
    setQuestionLimit(20);
    setFiltersApplied(false);
    setFilterCount(0);
    loadQuestionByOffset(0);
  };

  const resetQuestionState = () => {
    setSelectedAnswer('');
    setSubmitted(false);
    setExplanation(null);
    setHint(null);
    setCorrectAnswer('');
    setIsCorrect(false);
  };

  const navigateQuestion = (offset: number) => {
    loadQuestionByOffset(offset);
  };

  const handleSubmit = async () => {
    const question = questions[0];
    if (!question || !selectedAnswer) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    setSubmitted(true);
    try {
      const result = await practiceService.submitAnswer(question.id, selectedAnswer, timeSpent);
      setIsCorrect(result.isCorrect);
      setCorrectAnswer(result.correctAnswer);
      setStats((prev) => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        wrong: prev.wrong + (result.isCorrect ? 0 : 1),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const handleGetHint = async () => {
    const question = questions[0];
    if (!question) return;
    setLoadingHint(true);
    try {
      const h = await practiceService.getHint(question.id);
      setHint(h);
    } catch (err) {
      console.error('Failed to get hint:', err);
    } finally {
      setLoadingHint(false);
    }
  };

  const handleGetExplanation = async () => {
    const question = questions[0];
    if (!question) return;
    setLoadingExplanation(true);
    try {
      const exp = await practiceService.getExplanation(question.id, selectedAnswer);
      setExplanation(exp);
    } catch (err) {
      console.error('Failed to get explanation:', err);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const getCertLogo = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('aws') || lowerName.includes('amazon')) return '/aws-logo.png';
    if (lowerName.includes('google') || lowerName.includes('gcp')) return '/gcp-logo.png';
    return null;
  };

  const renderPagination = () => {
    const total = filtersApplied 
      ? Math.min(filterCount, questionLimit || 1000) 
      : totalQuestions;
    if (total === 0) return null;
    const current = currentIdx + 1;
    
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current > total - 4) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <span className="text-sm text-gray-500 whitespace-nowrap">Showing {current}-{current} of {total}</span>
          <div className="flex items-center gap-1 ml-2">
            <button 
              disabled={current === 1}
              onClick={() => loadQuestionByOffset(currentIdx - 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === 'number' && loadQuestionByOffset(p - 1)}
                disabled={p === '...' || p === current}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  p === current 
                    ? 'bg-red-600 text-white' 
                    : p === '...' 
                      ? 'cursor-default' 
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            
            <button 
              disabled={current === total}
              onClick={() => loadQuestionByOffset(currentIdx + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <input 
            type="text" 
            placeholder="Go to"
            value={goToNumber}
            onChange={(e) => setGoToNumber(e.target.value)}
            className="w-16 h-8 text-sm border rounded px-2 focus:outline-none focus:ring-1 focus:ring-red-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGoTo()}
          />
          <button 
            onClick={handleGoTo}
            className="h-8 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Go
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  // Certification selection
  if (!selectedCertId) {
    return (
      <div className="max-w-[1700px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Practice</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Select a certification to start practicing</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {certifications.map((cert) => {
            const logo = getCertLogo(cert.name);
            return (
              <button
                key={cert.id}
                onClick={() => setSelectedCertId(cert.id)}
                className="card hover:shadow-xl hover:-translate-y-1 transition-all text-left group p-0 overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-gray-800"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    {logo ? (
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <img src={logo} alt={cert.name} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                    <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-primary-500 transition-all transform group-hover:translate-x-1" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 text-lg leading-tight transition-colors">
                      {cert.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">
                      Master the key concepts and prepare for your certification exam with AI-powered practice.
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {cert._count.questions} questions
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Start Now
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const question = questions[0] || null;

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-2">
      {/* Header with stats and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Smart Practice</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {certifications.find((c) => c.id === selectedCertId)?.name}
            {filtersApplied && <span className="text-primary-600 ml-2">(Filtered)</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-3 text-sm bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300 font-semibold">{stats.correct}</span>
            </span>
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
            <span className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-gray-700 dark:text-gray-300 font-semibold">{stats.wrong}</span>
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium flex-1 md:flex-none flex items-center justify-center gap-2 border transition-all ${
              filtersApplied 
                ? 'bg-primary-50 text-primary-600 border-primary-200' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" /> Filters
            {filtersApplied && <span className="ml-1 bg-primary-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">!</span>}
          </button>
          <button
            onClick={() => {
              setSelectedCertId('');
              setQuestions([]);
              setStats({ correct: 0, wrong: 0, total: 0 });
              setFiltersApplied(false);
            }}
            className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium flex-1 md:flex-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Change Certification
          </button>
        </div>
      </div>

      {/* Modals */}
      {showTopicModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Topic</h3>
              <button onClick={() => setShowTopicModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <XCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
              <button
                onClick={() => { setSelectedTopic(''); setShowTopicModal(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedTopic === '' 
                    ? 'border-orange-200 bg-orange-50/50' 
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedTopic === '' ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                  {selectedTopic === '' && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm font-medium">All Topics</span>
              </button>
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => { setSelectedTopic(t); setShowTopicModal(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    selectedTopic === t 
                      ? 'border-orange-200 bg-orange-50/50' 
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedTopic === t ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                    {selectedTopic === t && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDifficultyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Difficulty</h3>
              <button onClick={() => setShowDifficultyModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <XCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => { setSelectedDifficulty(''); setShowDifficultyModal(false); }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  selectedDifficulty === '' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-400'
                }`}
              >
                <span className="font-bold">All Difficulties</span>
              </button>
              {difficulties.map(d => (
                <button
                  key={d}
                  onClick={() => { setSelectedDifficulty(d); setShowDifficultyModal(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    selectedDifficulty === d ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-400'
                  }`}
                >
                  <span className="font-bold">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <div className={`w-2 h-2 rounded-full ${d.toLowerCase() === 'easy' ? 'bg-green-500' : d.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="card mb-6 p-6 border-2 border-orange-100 dark:border-orange-900/30 bg-white dark:bg-gray-800 shadow-xl shadow-orange-500/5 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Filter className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-xl">Filter Questions</h3>
                <p className="text-xs text-gray-500">Refine your practice session</p>
              </div>
            </div>
            <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Topic Summary Card */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</span>
                <button onClick={() => setShowTopicModal(true)} className="text-xs font-bold text-orange-600 hover:underline">Manage</button>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {selectedTopic || 'All Topics'}
              </div>
            </div>

            {/* Difficulty Summary Card */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</span>
                <button onClick={() => setShowDifficultyModal(true)} className="text-xs font-bold text-orange-600 hover:underline">Manage</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                  {selectedDifficulty || 'All Difficulties'}
                </span>
                {selectedDifficulty && (
                  <div className={`w-2 h-2 rounded-full ${selectedDifficulty === 'easy' ? 'bg-green-500' : selectedDifficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                )}
              </div>
            </div>

            {/* Limit Card */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Limit</span>
                 <span className="text-[10px] font-bold text-orange-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                  {filterCount ? `${filterCount} avail.` : '--'}
                </span>
              </div>
              <input 
                type="number" 
                value={questionLimit} 
                onChange={(e) => setQuestionLimit(parseInt(e.target.value) || 20)} 
                className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-gray-900 dark:text-white text-sm" 
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
            <button onClick={handleApplyFilters} className="btn-primary flex-1 py-3 text-base !bg-orange-600 hover:!bg-orange-700 shadow-lg shadow-orange-500/20">
              Apply Filters & Reload
            </button>
            <button onClick={handleResetFilters} className="btn-secondary flex-1 py-3 text-base">
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex-shrink-0">
        {renderPagination()}
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start pb-8">
        {/* Left: Question */}
        <div className="min-w-0">
          <div className="card p-4 md:p-6 border border-gray-100 dark:border-gray-800">
            {loadingQuestion ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner message="Loading question..." />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center text-center p-4 md:p-8">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
                  <XCircle className="h-8 w-8 md:h-10 md:w-10 text-red-500" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-2">{error}</h3>
                {error.includes('session') ? (
                   <button onClick={() => window.location.href = '/login'} className="btn-primary mt-6 md:mt-8 px-6 md:px-8">
                    Log In Again
                  </button>
                ) : (
                  <button onClick={() => loadQuestionByOffset(currentIdx)} className="btn-primary mt-6 md:mt-8 px-6 md:px-8">
                    <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                  </button>
                )}
              </div>
            ) : question ? (
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400">
                    Topic: <span className="text-gray-800 dark:text-white">{question.topic}</span>
                  </span>
                  <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <span className="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400 capitalize">
                    Difficulty: <span className="text-gray-800 dark:text-white">{question.difficulty}</span>
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm md:text-base font-medium text-gray-800 dark:text-white mb-6 leading-relaxed">
                    {question.questionText}
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    {Object.entries(question.options).map(([key, value]) => {
                      let optionClass = 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-primary-900/10';
                      if (submitted) {
                        if (key === correctAnswer) {
                          optionClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                        } else if (key === selectedAnswer && !isCorrect) {
                          optionClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                        } else {
                          optionClass = 'border-gray-200 dark:border-gray-700 opacity-60';
                        }
                      } else if (key === selectedAnswer) {
                        optionClass = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/10';
                      }

                      return (
                        <button
                          key={key}
                          onClick={() => !submitted && setSelectedAnswer(key)}
                          disabled={submitted}
                          className={`w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all flex items-start gap-2 md:gap-3 group ${optionClass}`}
                        >
                          <span className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center text-xs md:text-sm font-bold transition-all ${
                            submitted && key === correctAnswer
                              ? 'bg-green-500 text-white border-green-500'
                              : submitted && key === selectedAnswer && !isCorrect
                                ? 'bg-red-500 text-white border-red-500'
                                : key === selectedAnswer
                                  ? 'bg-primary-500 text-white border-primary-500'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 group-hover:border-primary-400'
                          }`}>
                            {key}
                          </span>
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-200 pt-0.5">{value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  {!submitted ? (
                    <button 
                      onClick={handleSubmit} 
                      disabled={!selectedAnswer} 
                      className="w-full h-11 md:h-12 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                      <button
                        onClick={() => navigateQuestion(currentIdx - 1)}
                        disabled={currentIdx === 0}
                        className="flex-1 h-11 md:h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 disabled:opacity-40 order-2 sm:order-1"
                      >
                        <ChevronLeft className="h-5 w-5" /> Previous
                      </button>
                      <button 
                        onClick={() => navigateQuestion(currentIdx + 1)} 
                        disabled={currentIdx >= (filtersApplied ? Math.min(filterCount, questionLimit || 1000) : totalQuestions) - 1}
                        className="flex-1 h-11 md:h-12 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 order-1 sm:order-2"
                      >
                        Next <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Result banner */}
                {submitted && (
                  <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    isCorrect ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800/50'
                  }`}>
                    {isCorrect ? <CheckCircle className="h-6 w-6 flex-shrink-0" /> : <XCircle className="h-6 w-6 flex-shrink-0" />}
                    <div>
                      <span className="font-bold text-base md:text-lg">{isCorrect ? 'Correct!' : 'Incorrect'}</span>
                      {!isCorrect && <p className="text-xs md:text-sm opacity-90 mt-0.5">The correct answer is {correctAnswer}</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-8">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                  <HelpCircle className="h-8 w-8 md:h-10 md:w-10 text-gray-300" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-2">No Questions Found</h3>
                <p className="max-w-xs mx-auto text-sm">Try adjusting your filters or resetting the practice session.</p>
                <button onClick={handleResetFilters} className="btn-primary mt-6 md:mt-8 px-6 md:px-8">
                  <RotateCcw className="h-4 w-4 mr-2" /> Start Over
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Explanation / Hints */}
        <div className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-100px)]">
          <div className="card p-4 md:p-6 border border-gray-100 dark:border-gray-800 h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 flex-shrink-0">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white truncate">
                    {submitted ? 'AI Deep Insight' : 'AI Study Assistant'}
                  </h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Powered by Gemini AI</p>
                </div>
              </div>
              
              <div className="flex flex-row gap-2">
                {submitted && !explanation && !loadingExplanation && (
                  <button
                    onClick={handleGetExplanation}
                    className="flex-1 sm:flex-none bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Brain className="h-4 w-4" /> Analyze
                  </button>
                )}
                {!submitted && !hint && !loadingHint && question && (
                  <button
                    onClick={handleGetHint}
                    disabled={loadingHint}
                    className="flex-1 sm:flex-none bg-white dark:bg-gray-800 border-2 border-primary-100 dark:border-primary-900/30 text-primary-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-50 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <HelpCircle className="h-4 w-4" /> Hint?
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
              {loadingExplanation ? (
                <div className="h-full flex flex-col items-center justify-center py-20 animate-pulse text-center">
                  <Brain className="h-12 w-12 md:h-16 md:w-16 text-primary-200 mb-6 animate-bounce" />
                  <p className="text-gray-400 font-medium tracking-wide text-sm md:text-base px-4">AI is analyzing the architecture...</p>
                </div>
              ) : loadingHint ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative mb-6">
                    <Lightbulb className="h-12 w-12 md:h-16 md:w-16 text-yellow-100" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <p className="text-gray-400 font-medium text-sm md:text-base">Brewing some hints...</p>
                </div>
              ) : hint && !submitted ? (
                <div className="space-y-6 pb-4">
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                    <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3 mt-1">
                      <HelpCircle className="h-4 w-4" /> Conceptual Hints
                    </h3>
                    <ul className="space-y-3">
                      {hint.hints.map((h, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                          <span className="text-blue-500 font-bold">•</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100/50 dark:border-green-900/20">
                    <h3 className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3 mt-1">
                      <Lightbulb className="h-4 w-4" /> Exam Mastery Tips
                    </h3>
                    <ul className="space-y-3">
                      {hint.tips.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                          <span className="text-green-500 font-bold">✓</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20">
                    <h3 className="text-sm font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2 mt-1">
                      <RotateCcw className="h-4 w-4" /> Tactical Strategy
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">{hint.solvingStrategy}</p>
                  </div>
                </div>
              ) : explanation ? (
                <div className="space-y-6 pb-6 pr-2">
                  <div className="p-4 md:p-5 bg-primary-50/30 dark:bg-primary-900/10 rounded-2xl border border-primary-100/50">
                    <h3 className="text-xs md:text-sm font-bold text-primary-700 dark:text-primary-400 mb-2 uppercase tracking-wider">The Logic Flow</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">{explanation.stepByStep}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Why Option {correctAnswer} is Exact
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed px-4 py-3 bg-green-50/20 dark:bg-green-900/5 rounded-xl border-l-4 border-green-500">{explanation.correctAnswerExplanation}</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> Decoding Incorrect Options
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(explanation.wrongOptionsExplanation).map(([key, val]) => (
                        <div key={key} className="relative pl-6 py-1 before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:bg-orange-300 before:rounded-full border-b border-gray-50 dark:border-gray-800 last:border-0 pb-3 last:pb-0">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-0.5 uppercase">Option {key}</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50">
                      <h3 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Exam Trap</h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-normal">{explanation.examTrap}</p>
                    </div>
                    <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 rounded-2xl border border-teal-100/50">
                      <h3 className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase mb-1">Memory Trick</h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-normal">{explanation.memoryTrick}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50">
                    <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Deep Core Concept</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{explanation.conceptual}</p>
                  </div>

                  {explanation.sourceLinks && explanation.sourceLinks.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" /> Sources & References
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {explanation.sourceLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-primary-600 hover:text-primary-700 hover:border-primary-200 dark:hover:border-primary-900/50 transition-all shadow-sm"
                          >
                            <span className="truncate max-w-[150px]">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                  <Brain className="h-16 w-16 md:h-20 md:w-20 text-gray-100 dark:text-gray-800 mb-6" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Ready to Assist</h3>
                  <p className="text-xs md:text-sm text-gray-500 max-w-[200px]">Submit your answer or request a hint for intelligent guidance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
