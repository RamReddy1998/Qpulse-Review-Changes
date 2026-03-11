import { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { certificationService } from '../../services/certification.service';
import { UploadResult, Certification } from '../../types';
import { Upload, FileText, CheckCircle, AlertTriangle, Edit3, Trash2, Search, List } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore - Vite specific import for PDF worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}



interface ParsedQuestion {
  id?: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  difficulty: string;
  topic: string;
}

export function QuestionUploadPage() {
  const [mode, setMode] = useState<'upload' | 'edit'>('upload');
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedCertId, setSelectedCertId] = useState('');
  const [certificationName, setCertificationName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [debugPdfText, setDebugPdfText] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchCertifications();
    
    // Handle query parameters
    const params = new URLSearchParams(window.location.search);
    const paramMode = params.get('mode');
    const paramCertId = params.get('certId');

    if (paramMode === 'edit') {
      setMode('edit');
    }
    if (paramCertId) {
      setSelectedCertId(paramCertId);
    }
  }, []);

  useEffect(() => {
    if (mode === 'edit' && selectedCertId) {
      loadCertificationQuestions(selectedCertId);
    } else if (mode === 'upload') {
      setParsedQuestions([]);
    }
  }, [mode, selectedCertId]);

  const fetchCertifications = async () => {
    try {
      const data = await certificationService.getAll();
      setCertifications(data);
    } catch (err) {
      console.error('Failed to fetch certifications', err);
    }
  };

  const loadCertificationQuestions = async (certId: string) => {
    setLoadingQuestions(true);
    setError('');
    try {
      const response = await adminService.getQuestionsByCertification(certId, 1, 1000);
      setParsedQuestions(response.data.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options as unknown as Record<string, string>,
        correctAnswer: (q as any).correctAnswer || 'A',
        difficulty: q.difficulty,
        topic: q.topic
      })));
    } catch (err) {
      setError('Failed to load questions for this certification.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const mapFlexibleQuestion = (row: any): ParsedQuestion => {
    // If it's already structured correctly, return it (with fallbacks)
    if (row.questionText && row.options && typeof row.options === 'object') {
      return {
        questionText: row.questionText,
        options: {
          A: row.options.A || '',
          B: row.options.B || '',
          C: row.options.C || '',
          D: row.options.D || ''
        },
        correctAnswer: row.correctAnswer || '',
        difficulty: row.difficulty || 'Medium',
        topic: row.topic || 'General'
      };
    }

    // Otherwise, intelligently map flat structures
    const getVal = (keys: string[]) => {
      for (const key of keys) {
        const foundKey = Object.keys(row).find(k => 
          k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (foundKey && row[foundKey] !== undefined) return String(row[foundKey]);
      }
      return '';
    };

    let answer = getVal(['answer', 'correctanswer', 'correct', 'answers']);
    // if answer is something like "Option A" or "A. Apple", try to grab just the letter
    if (answer.length > 1) {
      const match = answer.match(/^[oO]ption\s*([A-D])|^([A-D])[\.\)]/);
      if (match) answer = match[1] || match[2];
      else if (answer.trim().length === 1) answer = answer.trim(); // Just in case it's something like " B "
    }

    return {
      questionText: getVal(['question', 'questiontext', 'text', 'q']),
      options: {
        A: getVal(['optiona', 'a', 'choicea']),
        B: getVal(['optionb', 'b', 'choiceb']),
        C: getVal(['optionc', 'c', 'choicec']),
        D: getVal(['optiond', 'd', 'choiced']),
      },
      correctAnswer: answer.toUpperCase() || 'A',
      difficulty: getVal(['difficulty', 'level']) || 'Medium',
      topic: getVal(['topic', 'topics', 'category', 'subject']) || 'General'
    };
  };

  const extractQuestionsFromPDFText = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    
    // Method 1: Look for the "Json to PDF" tabular format
    if (text.includes('questionText options correctAnswer difficulty topic')) {
      const headerPhrase = 'questionText options correctAnswer difficulty topic';
      const blocks = text.split(headerPhrase).slice(1);

      for (const block of blocks) {
        if (!block.trim()) continue;

        const structureMatch = block.match(/^\s*(.*?)\s+\[Nested Data\]\s+([A-D])\s+(\w+)\s+(.*?)\s+A\s+B\s+C\s+D\s+(.*)/is);
        
        if (structureMatch) {
          const qText = structureMatch[1].trim();
          const correctAnswer = structureMatch[2].toUpperCase();
          const difficulty = structureMatch[3].trim();
          const topic = structureMatch[4].trim();
          const rawOptions = structureMatch[5].trim();

          const options: Record<string, string> = { A: '', B: '', C: '', D: '' };
          const optParts = rawOptions.split(/\s{2,}/).filter(p => p.trim());
          if (optParts.length >= 4) {
            options.A = optParts[0].trim();
            options.B = optParts[1].trim();
            options.C = optParts[2].trim();
            options.D = optParts[3].trim();
          } else {
            const simpleParts = rawOptions.split(/\s+/).filter(p => p.trim());
            if (simpleParts.length >= 4) {
              options.A = simpleParts[0].trim();
              options.B = simpleParts[1].trim();
              options.C = simpleParts[2].trim();
              options.D = simpleParts[3].trim();
            }
          }

          if (qText) {
            questions.push({
              questionText: qText,
              options,
              correctAnswer,
              difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
              topic
            });
          }
        }
      }
    }

    if (questions.length > 0) return questions;

    // Method 2: Comprehensive Regex for various formats
    // This looks for: 1. Question text OR (1) Question text OR Question 1: text
    // Followed by options like A. Text OR (A) Text OR A) Text
    
    // Split by question markers: "1.", "Question 1:", etc. at the start of a line or after whitespace
    const questionBlocks = text.split(/(?=\n\s*(?:\d+[\.\)]|Question\s*\d+[:\.]|Q\d+[:\.]|^\d+\s+)\s+)/i);
    
    for (let block of questionBlocks) {
      if (!block.trim() || block.length < 15) continue;
      
      // Try to extract question text
      // Patterns: 1. <text>, (1) <text>, Question 1: <text>, Q1. <text>
      const qMatch = block.match(/(?:\d+[\.\)]|Question\s*\d+[:\.]|Q\d+[:\.]|^)\s*(.*?)(?=\s*(?:\n|\s)[A-D][\.\)]|\s+(?:\([A-D]\)|[A-D]\))\s+|$)/is);
      
      if (qMatch && qMatch[1].trim()) {
        const questionText = qMatch[1].replace(/\s+/g, ' ').trim();
        
        // Try to find options
        const options: Record<string, string> = { A: '', B: '', C: '', D: '' };
        
        // Pattern variations: A. <text>, (A) <text>, A) <text>
        const optPatterns = [
          { key: 'A', regex: /(?:\n|\s|^)[(]?A[.\)]\s*(.*?)(?=(?:\n|\s)[(]?B[.\)]|$)/is },
          { key: 'B', regex: /(?:\n|\s|^)[(]?B[.\)]\s*(.*?)(?=(?:\n|\s)[(]?C[.\)]|$)/is },
          { key: 'C', regex: /(?:\n|\s|^)[(]?C[.\)]\s*(.*?)(?=(?:\n|\s)[(]?D[.\)]|$)/is },
          { key: 'D', regex: /(?:\n|\s|^)[(]?D[.\)]\s*(.*?)(?=(?:\n|\s)(?:Answer|Correct|Explanation|Difficulty|Topic)[\s:]|$)/is }
        ];

        let foundOptions = 0;
        for (const { key, regex } of optPatterns) {
          const match = block.match(regex);
          if (match && match[1].trim()) {
            options[key] = match[1].replace(/\s+/g, ' ').trim();
            foundOptions++;
          }
        }

        // If standard regex didn't find much, try a simpler "split by letters" approach
        if (foundOptions < 2) {
          const simpleSplit = block.split(/\s+([A-D][\.\)\s])\s+/);
          if (simpleSplit.length >= 8) { // ["question", "A.", "text", "B.", "text"...]
            for (let i = 1; i < simpleSplit.length; i += 2) {
              const keyToken = simpleSplit[i].trim();
              const key = keyToken.charAt(keyToken.startsWith('(') ? 1 : 0).toUpperCase();
              if (['A', 'B', 'C', 'D'].includes(key) && simpleSplit[i+1]) {
                options[key] = simpleSplit[i+1].trim();
                foundOptions++;
              }
            }
          }
        }

        // Extract Answer
        const ansMatch = block.match(/(?:Answer|Correct)(?:\s+is)?[\s:]*\s*([A-D])/i);
        const correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : 'A';

        // Extract Difficulty
        const diffMatch = block.match(/Difficulty[\s:]*\s*(Easy|Medium|Hard)/i);
        const difficulty = diffMatch ? diffMatch[1] : 'Medium';

        // Extract Topic
        const topicMatch = block.match(/Topic[\s:]*\s*(.*?)(?:\n|$)/i);
        const topic = topicMatch ? topicMatch[1].trim() : 'General';

        if (questionText && foundOptions >= 2) {
          questions.push({
            questionText,
            options,
            correctAnswer,
            difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
            topic: topic || 'General'
          });
        }
      }
    }
    
    return questions;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadResult(null);
    setExtracting(true);

    try {
      const questions = await adminService.aiExtractQuestions(file);
      if (questions && questions.length > 0) {
        setParsedQuestions(questions.map(mapFlexibleQuestion).filter((q: ParsedQuestion) => q.questionText));
      } else {
        setError('No questions could be extracted from this file.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to extract questions using AI.');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const handleDeleteQuestion = async (idx: number) => {
    const question = parsedQuestions[idx];
    if (mode === 'edit' && question.id) {
      if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
      try {
        await adminService.deleteQuestion(question.id);
      } catch (err) {
        setError('Failed to delete question from database.');
        return;
      }
    }
    setParsedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditQuestion = (idx: number, field: string, value: string) => {
    setParsedQuestions((prev) => prev.map((q, i) => {
      if (i !== idx) return q;
      if (field.startsWith('option_')) {
        const optKey = field.replace('option_', '');
        return { ...q, options: { ...q.options, [optKey]: value } };
      }
      return { ...q, [field]: value };
    }));
  };

  const saveQuestionEdit = async (idx: number) => {
    const question = parsedQuestions[idx];
    if (mode === 'edit' && question.id) {
      try {
        await adminService.updateQuestion(question.id, {
          questionText: question.questionText.trim(),
          options: question.options as any,
          correctAnswer: question.correctAnswer,
          difficulty: question.difficulty,
          topic: question.topic
        } as any);
      } catch (err) {
        setError('Failed to save changes to the database.');
        return;
      }
    }
    setEditingIdx(null);
  };

  const handleUploadQuestions = async () => {
    if (!certificationName.trim() || parsedQuestions.length === 0) {
      setError('Please provide a certification name and upload questions to proceed.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const result = await adminService.uploadQuestionsNew(certificationName.trim(), parsedQuestions);
      setUploadResult(result);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to upload questions');
    } finally {
      setUploading(false);
    }
  };

  const startOver = () => {
    setUploadResult(null);
    setParsedQuestions([]);
    setCertificationName('');
    setSelectedCertId('');
    setError('');
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Questions Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'upload' ? 'Import new questions for a certification' : 'Edit or delete existing questions'}
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
              mode === 'upload' 
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload New
          </button>
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
              mode === 'edit' 
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-4 w-4" />
            Edit Existing
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            {debugPdfText && (
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs font-semibold underline text-red-700 dark:text-red-400 hover:text-red-800"
              >
                {showDebug ? 'Hide Debug Info' : 'Show Extracted Text'}
              </button>
            )}
          </div>
          
          {showDebug && debugPdfText && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-950 border border-red-100 dark:border-red-900 rounded overflow-x-auto max-h-96">
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {debugPdfText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Result Summary */}
      {uploadResult && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Complete</h3>
            <button onClick={startOver} className="btn-secondary text-sm">Upload Another Set</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{uploadResult.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Detected</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{uploadResult.successful}</p>
              <p className="text-sm text-green-700 dark:text-green-500 mt-1">Successfully Imported</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{uploadResult.failed}</p>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">Failed to Import</p>
            </div>
          </div>
          
          {uploadResult.failures.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Errors</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {uploadResult.failures.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <p><strong>Question {f.index + 1}:</strong> {f.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      {!uploadResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {mode === 'upload' && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">JSON Format Requirements:</p>
              <pre className="text-xs bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-800 p-3 rounded overflow-x-auto text-gray-700 dark:text-gray-300">
  {`[
    {
      "questionText": "What is the primary function of...?",
      "options": { "A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth option" },
      "correctAnswer": "A",
      "difficulty": "Medium",
      "topic": "Core Concepts"
    }
  ]`}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {mode === 'upload' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Certification Name
                </label>
                <input
                  type="text"
                  value={certificationName}
                  onChange={(e) => setCertificationName(e.target.value)}
                  placeholder="e.g., AWS Developer Associate"
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-2">
                  If the certification doesn't exist, it will be automatically created.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Certification
                </label>
                <select
                  value={selectedCertId}
                  onChange={(e) => setSelectedCertId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choose a Certification --</option>
                  {certifications.map((cert) => (
                    <option key={cert.id} value={cert.id}>
                      {cert.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Choose a certification to see and edit its questions.
                </p>
              </div>
            )}
            
            {mode === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question File
                </label>
                <label className="flex items-center justify-center w-full h-11 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500">
                  <span className="flex items-center space-x-2">
                    {extracting ? (
                      <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                    ) : (
                      <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {extracting ? 'AI Extracting Questions...' : 'Browse File (JSON, Excel, CSV, PDF)'}
                    </span>
                  </span>
                  <input type="file" accept=".json,.xlsx,.xls,.csv,.pdf" onChange={handleFileUpload} className="hidden" disabled={extracting} />
                </label>
              </div>
            )}
          </div>

          {/* Review Questions Section */}
          {(parsedQuestions.length > 0 || loadingQuestions) && (
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  {mode === 'upload' ? 'Review & Upload' : 'Certification Questions'} ({parsedQuestions.length})
                </h3>
                {mode === 'upload' && (
                  <button
                    onClick={handleUploadQuestions}
                    disabled={uploading || !certificationName.trim()}
                    className="btn-primary flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {uploading ? 'Processing Upload...' : 'Approve & Upload'}
                  </button>
                )}
              </div>

              {loadingQuestions ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading questions from certification...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {parsedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600">
                    {editingIdx === idx ? (
                      <div className="space-y-3">
                        <textarea
                          value={q.questionText}
                          onChange={(e) => handleEditQuestion(idx, 'questionText', e.target.value)}
                          className="input-field min-h-[80px]"
                          placeholder="Question text"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
                                {opt}
                              </span>
                              <input
                                value={q.options[opt] || ''}
                                onChange={(e) => handleEditQuestion(idx, `option_${opt}`, e.target.value)}
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                placeholder={`Option text`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Correct Answer</label>
                            <select value={q.correctAnswer} onChange={(e) => handleEditQuestion(idx, 'correctAnswer', e.target.value)} className="input-field">
                              {['A', 'B', 'C', 'D'].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Difficulty</label>
                            <select value={q.difficulty} onChange={(e) => handleEditQuestion(idx, 'difficulty', e.target.value)} className="input-field">
                              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Topic</label>
                            <input value={q.topic} onChange={(e) => handleEditQuestion(idx, 'topic', e.target.value)} className="input-field" placeholder="Topic" />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button onClick={() => saveQuestionEdit(idx)} className="btn-primary text-sm px-6">
                            {mode === 'edit' ? 'Save to DB' : 'Save Edits'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold dark:bg-primary-900/40 dark:text-primary-400 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-gray-900 dark:text-white font-medium">{q.questionText}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3 ml-8">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                                {q.topic}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-opacity-10 
                                ${q.difficulty === 'Easy' ? 'bg-green-500 text-green-700 dark:text-green-400' : 
                                  q.difficulty === 'Hard' ? 'bg-red-500 text-red-700 dark:text-red-400' : 
                                  'bg-yellow-500 text-yellow-700 dark:text-yellow-400'}`}>
                                {q.difficulty}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                                Answer: {q.correctAnswer}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button onClick={() => setEditingIdx(idx)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">Edit</button>
                            <button onClick={() => handleDeleteQuestion(idx)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Delete</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4 ml-8">
                            {Object.entries(q.options).map(([key, value]) => (
                              <div key={key} className={`p-2 rounded text-sm ${key === q.correctAnswer ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100' : 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}>
                                <span className={`font-semibold mr-2 ${key === q.correctAnswer ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{key}.</span>
                                {value}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
