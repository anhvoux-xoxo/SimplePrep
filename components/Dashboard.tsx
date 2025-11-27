
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Sparkles, Trash2, Edit3, Save, Star, Bookmark, BookmarkCheck, Video, X, Check, Filter, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Question, QuestionCategory } from '../types';
import { generateInterviewQuestions } from '../services/geminiService';
import { getQuestions, saveQuestion, deleteQuestion } from '../services/db';
import { useAuth } from '../context/AuthContext';

type TabType = 'Session' | 'Saved' | 'Starred';

// Dropdown mapping options
const CATEGORY_OPTIONS = [
  { label: 'Complete Session', value: QuestionCategory.COMPLETE_SESSION },
  { label: 'Background', value: QuestionCategory.BACKGROUND },
  { label: 'Behavioral', value: QuestionCategory.BEHAVIORAL },
  { label: 'Technical', value: QuestionCategory.TECHNICAL },
];

const OnboardingHint: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => (
  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-start gap-4 mb-6 animate-fade-in shadow-sm">
    <div className="flex gap-3">
        <div className="mt-0.5 text-indigo-600 bg-white rounded-full p-1 shadow-sm">
            <Sparkles size={16} fill="currentColor" />
        </div>
        <p className="text-sm text-indigo-900 font-medium leading-relaxed">{message}</p>
    </div>
    <button onClick={onDismiss} className="text-indigo-400 hover:text-indigo-700 transition-colors">
      <X size={18} />
    </button>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [sessionName, setSessionName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGenTab, setActiveGenTab] = useState<QuestionCategory | ''>('');
  const [activeListTab, setActiveListTab] = useState<TabType>('Session');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual Input State
  const [manualQ, setManualQ] = useState('');
  const [manualA, setManualA] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // Onboarding State
  const [showSelectionHint, setShowSelectionHint] = useState(true);
  const [showCustomQHint, setShowCustomQHint] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [user]);

  const loadQuestions = async () => {
    try {
      const q = await getQuestions(user?.id);
      setQuestions(q.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error("Failed to load questions", e);
    }
  };

  // Get unique session names
  const sessionNames = useMemo(() => {
    const names = new Set(questions.map(q => q.sessionName).filter(Boolean));
    return Array.from(names);
  }, [questions]);

  // Set default filter
  useEffect(() => {
      if (sessionNames.length > 0 && !selectedSessionFilter) {
          setSelectedSessionFilter(sessionNames[0] || '');
      }
  }, [sessionNames]);

  // Filter questions based on Tab
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (activeListTab === 'Saved') return q.isSaved;
      if (activeListTab === 'Starred') return q.isStarred;
      if (activeListTab === 'Session') {
           if (!selectedSessionFilter) return false;
           return q.sessionName === selectedSessionFilter;
      }
      return false;
    });
  }, [questions, activeListTab, selectedSessionFilter]);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return alert("Please paste a job description first.");
    if (!activeGenTab) return alert("Please select a question category.");
    
    setLoading(true);
    
    try {
      const newQuestions = await generateInterviewQuestions(jobDescription, activeGenTab as QuestionCategory);
      const currentSessionName = sessionName.trim() || `Session ${new Date().toLocaleDateString()}`;
      
      for (const q of newQuestions) {
        q.userId = user?.id;
        q.sessionName = currentSessionName;
        await saveQuestion(q);
      }
      setSessionName(currentSessionName);
      setSelectedSessionFilter(currentSessionName);
      await loadQuestions();
      setActiveListTab('Session');
    } catch (error) {
      console.error(error);
      alert("Failed to generate questions. Check API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualQ.trim()) return;
    const currentSessionName = sessionName.trim() || `Session ${new Date().toLocaleDateString()}`;
    
    const q: Question = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id,
      text: manualQ,
      manualAnswer: manualA,
      category: QuestionCategory.BACKGROUND,
      aiGenerated: false,
      createdAt: Date.now(),
      isSaved: false,
      isStarred: false,
      sessionName: currentSessionName
    };
    await saveQuestion(q);
    
    setSessionName(currentSessionName);
    setSelectedSessionFilter(currentSessionName);
    
    setManualQ('');
    setManualA('');
    setShowManualInput(false);
    loadQuestions();
    setActiveListTab('Session');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this question?")) {
      await deleteQuestion(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadQuestions();
    }
  };

  const toggleSave = async (q: Question) => {
    const updated = { ...q, isSaved: !q.isSaved };
    await saveQuestion(updated);
    loadQuestions();
  };

  const toggleStar = async (q: Question) => {
    const updated = { ...q, isStarred: !q.isStarred };
    await saveQuestion(updated);
    loadQuestions();
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditAnswer(q.manualAnswer || '');
  };

  const saveEdit = async (q: Question) => {
    if (!editText.trim()) return;
    await saveQuestion({ 
        ...q, 
        text: editText,
        manualAnswer: editAnswer 
    });
    setEditingId(null);
    loadQuestions();
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      const allIds = filteredQuestions.map(q => q.id);
      setSelectedIds(new Set(allIds));
    }
  };

  const handlePracticeSelected = () => {
    const idsToPractice = Array.from(selectedIds);
    if (idsToPractice.length === 0) return alert("Select at least one question to practice.");
    navigate('/practice', { state: { questionIds: idsToPractice } });
  };
  
  const handleSessionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === 'ADD_NEW_SESSION_MAGIC_VAL') {
          setSelectedSessionFilter('');
          setSessionName('');
          setJobDescription('');
          setActiveListTab('Session');
          setSelectedIds(new Set());
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          setActiveListTab('Session');
          setSelectedSessionFilter(val);
          setSelectedIds(new Set());
      }
  };

  const isAllSelected = filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length;

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500">Manage your interview preparation material.</p>
      </header>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            
            <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-800 mb-2">Interview Session Name</label>
                <input
                    type="text"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-black bg-white"
                    placeholder="e.g. Google Frontend Role"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                />
            </div>

            <label className="block text-sm font-semibold text-slate-800 mb-2">Job Description</label>
            <textarea
              className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black resize-y text-black bg-white text-base"
              placeholder="Paste the job description here to generate tailored questions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                 <select
                    value={activeGenTab}
                    onChange={(e) => setActiveGenTab(e.target.value as QuestionCategory)}
                    className="w-full appearance-none px-6 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer whitespace-normal h-full"
                    style={{ minHeight: '42px' }}
                  >
                    <option value="" disabled className="bg-white text-slate-700">Select Your Interview Questions</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-white text-slate-700">{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !jobDescription || !activeGenTab}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-all shadow-sm ${
                  loading || !jobDescription || !activeGenTab
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 border border-indigo-600'
                }`}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="space-y-4">
           {!showManualInput ? (
             <div className="h-full flex flex-col">
                <button 
                    onClick={() => setShowManualInput(true)}
                    className="w-full flex-1 min-h-[200px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                >
                    <div className="bg-slate-100 p-4 rounded-full group-hover:bg-white mb-3">
                        <Plus size={24} />
                    </div>
                    <span className="font-medium">Add Custom Question</span>
                </button>
                {showCustomQHint && (
                    <div className="mt-4">
                        <OnboardingHint 
                            message="Manually add your own interview questions to practice."
                            onDismiss={() => setShowCustomQHint(false)}
                        />
                    </div>
                )}
             </div>
           ) : (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800">New Custom Question</h3>
                    <button onClick={() => setShowManualInput(false)} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
                </div>
                <input 
                    type="text" 
                    placeholder="Enter question..." 
                    className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-black text-black bg-white"
                    value={manualQ}
                    onChange={(e) => setManualQ(e.target.value)}
                />
                <textarea 
                    placeholder="Key talking points or answer (optional)..." 
                    className="w-full flex-1 p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-black resize-y text-black bg-white"
                    value={manualA}
                    onChange={(e) => setManualA(e.target.value)}
                />
                <button 
                    onClick={handleManualAdd}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-100 border border-indigo-600"
                >
                    Save Question
                </button>
             </div>
           )}
        </div>
      </div>

      {/* Practice Questions List Section */}
      <div className="mt-8">
        
        {/* Onboarding Hint */}
        {showSelectionHint && questions.length > 0 && (
          <OnboardingHint 
            message="Select the question(s) you want to practice below. You can practice all of them at once or choose specific ones."
            onDismiss={() => setShowSelectionHint(false)}
          />
        )}

        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 border-b border-slate-200 pb-4 gap-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Practice Questions
            </h3>
            
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                {/* Session Filter Dropdown */}
                <div className="relative flex-grow sm:flex-grow-0 min-w-[220px]">
                     <select
                        value={activeListTab === 'Session' ? selectedSessionFilter : ''}
                        onChange={handleSessionFilterChange}
                        className={`w-full appearance-none px-6 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                             activeListTab === 'Session'
                             ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                             : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                     >
                        <option value="" disabled className="bg-white text-black">Select Interview Session</option>
                        {sessionNames.length > 0 ? (
                            sessionNames.map(name => (
                                <option key={name} value={name} className="text-black bg-white">{name}</option>
                            ))
                        ) : (
                             <option value="" className="text-black bg-white">No Sessions Created</option>
                        )}
                        <option disabled className="bg-white text-slate-300">──────────</option>
                        <option value="ADD_NEW_SESSION_MAGIC_VAL" className="text-indigo-600 font-semibold bg-white">Add New Interview Session</option>
                     </select>
                     <div className={`absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none ${activeListTab === 'Session' ? 'text-white' : 'text-slate-500'}`}>
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                     </div>
                </div>

                {(['Saved', 'Starred'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveListTab(tab); setSelectedIds(new Set()); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                            activeListTab === tab 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>

        {/* Select All Controls */}
        {filteredQuestions.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-2">
            <button 
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isAllSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
              }`}>
                {isAllSelected && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              Select All
            </button>
            <span className="text-xs text-slate-400">({selectedIds.size} selected)</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4 mb-8">
          {filteredQuestions.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {activeListTab === 'Session' && (selectedSessionFilter ? "No questions in this session." : "Select a session or create new to start.")}
                {activeListTab === 'Saved' && "No saved questions."}
                {activeListTab === 'Starred' && "No starred questions."}
            </div>
          )}
          
          {filteredQuestions.map((q) => (
            <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all group flex gap-4">
                
                {/* Custom Checkbox */}
                <div className="flex items-start pt-1">
                   <div 
                        onClick={() => handleSelect(q.id)}
                        className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${
                            selectedIds.has(q.id) 
                            ? 'bg-indigo-600 border-indigo-600' 
                            : 'bg-white border-slate-300 hover:border-indigo-400'
                        }`}
                   >
                        {selectedIds.has(q.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                   </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-4 justify-between items-start">
                    {/* Question Content */}
                    <div className="flex-1 w-full">
                        {editingId === q.id ? (
                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Question</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-lg text-black bg-white resize-y focus:ring-2 focus:ring-indigo-500"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    autoFocus
                                    rows={2}
                                />
                                <label className="text-xs font-semibold text-slate-500 uppercase mt-1">Answer / Notes</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-lg text-black bg-white resize-y focus:ring-2 focus:ring-indigo-500"
                                    value={editAnswer}
                                    onChange={(e) => setEditAnswer(e.target.value)}
                                    rows={3}
                                    placeholder="Add talking points here..."
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => saveEdit(q)} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
                                        <Save size={16} /> Save Changes
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="font-medium text-slate-900 text-lg leading-snug cursor-pointer hover:text-indigo-600" onClick={() => startEdit(q)} title="Click to edit">
                                    {q.text}
                                </h4>
                                {q.manualAnswer && (
                                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{q.manualAnswer}</p>
                                )}
                                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">{q.category}</span>
                                    {q.sessionName && (
                                         <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-500 font-medium">{q.sessionName}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-start md:self-center w-full md:w-auto mt-4 md:mt-0 justify-end">
                         {/* Save (Bookmark) */}
                         <button 
                            onClick={() => toggleSave(q)}
                            className={`p-2 rounded-lg border transition-colors ${q.isSaved 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300'}`}
                            title={q.isSaved ? "Remove from Saved" : "Save Question"}
                         >
                            {q.isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                         </button>

                         {/* Star */}
                         <button 
                            onClick={() => toggleStar(q)}
                            className={`p-2 rounded-lg border transition-colors ${q.isStarred 
                                ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-300'}`}
                            title={q.isStarred ? "Unstar" : "Star Question"}
                         >
                            <Star size={18} fill={q.isStarred ? "currentColor" : "none"} />
                         </button>

                         {/* Edit */}
                         <button 
                            onClick={() => startEdit(q)}
                            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 rounded-lg transition-colors"
                            title="Edit"
                         >
                            <Edit3 size={18} />
                         </button>

                         {/* Delete */}
                         <button 
                            onClick={() => handleDelete(q.id)}
                            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg transition-colors"
                            title="Remove"
                         >
                            <Trash2 size={18} />
                         </button>
                    </div>
                </div>
            </div>
          ))}
        </div>

        {/* Floating / Bottom Practice Button */}
        {questions.length > 0 && (
             <div className="sticky bottom-4 z-10 flex justify-center">
                 <button
                    onClick={handlePracticeSelected}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 transition-transform transform hover:scale-105"
                 >
                     <Video size={20} />
                     <span>Practice {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Selected'} Questions</span>
                 </button>
             </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
