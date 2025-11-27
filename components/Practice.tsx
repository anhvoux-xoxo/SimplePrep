import React, { useState, useEffect, useRef } from 'react';
import { Square, RotateCcw, Eye, Video as VideoIcon, FolderInput, Mic, ChevronRight, ChevronLeft, Save, Play, Clock, X, Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Question, Recording, Note } from '../types';
import { getQuestions, saveRecording, getNote, saveNote, saveQuestion } from '../services/db';
import { useAuth } from '../context/AuthContext';

type PracticePhase = 'setup' | 'idle' | 'pre-prep' | 'prep' | 'pre-answer' | 'answering' | 'review';
type PracticeMode = 'prep-answer' | 'answer-only';

const OnboardingHint: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => (
  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex justify-between items-start gap-3 animate-fade-in shadow-sm my-2">
    <div className="flex gap-2">
        <Info size={16} className="text-indigo-600 mt-0.5" />
        <p className="text-xs text-indigo-900 font-medium leading-relaxed">{message}</p>
    </div>
    <button onClick={onDismiss} className="text-indigo-400 hover:text-indigo-700">
      <X size={14} />
    </button>
  </div>
);

const Practice: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Data State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [note, setNote] = useState('');
  
  // Phase & Timer State
  const [phase, setPhase] = useState<PracticePhase>('setup');
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef<number | null>(null);
  const [mode, setMode] = useState<PracticeMode>('prep-answer');
  
  // Onboarding Hints State
  const [showPracticeHint, setShowPracticeHint] = useState(true);
  const [showNoteHint, setShowNoteHint] = useState(true);

  // Audio Context for Beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Media State
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Constants
  const PRE_PREP_TIME = 3;
  const PREP_TIME = 60;
  const PRE_ANSWER_TIME = 3;
  const ANSWER_TIME = 150; // 2m 30s

  useEffect(() => {
    const init = async () => {
      const q = await getQuestions(user?.id);
      const sortedQ = q.sort((a, b) => b.createdAt - a.createdAt);
      
      // Handle specific question navigation from Dashboard
      if (location.state?.questionIds && Array.isArray(location.state.questionIds)) {
          const selected = sortedQ.filter(item => location.state.questionIds.includes(item.id));
          if (selected.length > 0) {
              setQuestions(selected);
          } else {
              setQuestions(sortedQ);
          }
      } else {
          setQuestions(sortedQ);
      }
      
      startCamera();
    };
    init();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [location.state, user]);

  // Load notes when question changes
  useEffect(() => {
    const loadNote = async () => {
      if (questions.length > 0) {
        const currentQ = questions[currentQIndex];
        const savedNote = await getNote(currentQ.id, user?.id);
        setNote(savedNote?.content || '');
      }
    };
    loadNote();
    resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQIndex, questions, user]);

  // Audio Beep Helper
  const playBeep = (freq = 880, dur = 0.5) => {
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing media devices", err);
      alert("Please allow camera/microphone access to practice.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
  };

  const resetSession = () => {
      setPhase('setup');
      setTimeLeft(0);
      setRecordedBlob(null);
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoRef.current && stream) {
        videoRef.current.src = "";
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
  };

  // --- Workflow Control ---

  const handleStartSequence = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (mode === 'prep-answer') {
          // Mode A: Prep -> Answer
          // Start prep timer logic
          startPrep();
      } else {
          // Mode B: Answer Only
          // Start countdown then answer
          startPreAnswer();
      }
  };

  const startPrep = () => {
      setPhase('prep');
      setTimeLeft(PREP_TIME);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              const newVal = prev - 1;
              
              // Sound: Last 3 seconds (3, 2, 1)
              if (newVal <= 3 && newVal > 0) {
                  playBeep(440, 0.2);
              }
              
              if (newVal <= 0) {
                  clearInterval(timerRef.current!);
                  startPreAnswer(); // Auto transition
                  return 0;
              }
              return newVal;
          });
      }, 1000);
  };

  const startPreAnswer = () => {
    setPhase('pre-answer');
    setTimeLeft(PRE_ANSWER_TIME);
    if (timerRef.current) clearInterval(timerRef.current);

    playBeep(440, 0.2); // Beep 3

    timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
            const newVal = prev - 1;
            if (newVal > 0) playBeep(440, 0.2); // Beep 2, 1
            if (newVal <= 0) {
                clearInterval(timerRef.current!);
                handleStartRecording();
                return 0;
            }
            return newVal;
        });
    }, 1000);
  };

  const handleStartRecording = () => {
      if(!stream) return;
      
      setPhase('answering');
      setTimeLeft(ANSWER_TIME);
      
      // Start sound
      playBeep(880, 0.5);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
  
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
      };
  
      recorder.start();
      mediaRecorderRef.current = recorder;
      
      // Timer for Answer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              const newVal = prev - 1;
              // Sound: Last 10 seconds
              if (newVal <= 10 && newVal > 0) {
                  playBeep(440, 0.2);
              }
              if (newVal <= 0) {
                  handleStopRecording();
                  return 0;
              }
              return newVal;
          });
      }, 1000);
  };

  const handleStopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('review');
  };

  const handleSaveRecording = async () => {
      if (!recordedBlob) return;
      const currentQ = questions[currentQIndex];
      
      const recording: Recording = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user?.id,
        questionId: currentQ?.id || null,
        questionText: currentQ?.text || "Freestyle Practice",
        blob: recordedBlob,
        duration: ANSWER_TIME - timeLeft, // approx
        createdAt: Date.now()
      };
      
      await saveRecording(recording);
      
      // Update Question History
      if (currentQ) {
          await saveQuestion({ ...currentQ, lastPracticedAt: Date.now() });
      }

      alert("Recording saved to Library!");
      resetSession();
  };

  const handleWatch = () => {
      if (recordedBlob && videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(recordedBlob);
          videoRef.current.muted = false;
          videoRef.current.play();
      }
  };

  const saveCurrentNote = async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentQIndex];
    const newNote: Note = {
        id: currentQ.id,
        userId: user?.id,
        sessionId: 'default',
        content: note,
        lastUpdated: Date.now(),
        title: currentQ.text
    };
    await saveNote(newNote);
  };

  const handleImportToNotes = async () => {
      if (!note.trim()) return;
      await saveCurrentNote();
      alert("Note saved to Notes page.");
  };

  // Auto-save debounce
  useEffect(() => {
      const timeout = setTimeout(() => {
          if (note) saveCurrentNote();
      }, 2000);
      return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const nextQuestion = () => {
      if (currentQIndex < questions.length - 1) {
          setCurrentQIndex(prev => prev + 1);
      }
  };
  
  const prevQuestion = () => {
      if (currentQIndex > 0) {
          setCurrentQIndex(prev => prev - 1);
      }
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
        {/* Question Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[120px] flex flex-col justify-between relative">
           {questions.length > 0 ? (
               <>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 block">
                            Question {currentQIndex + 1} of {questions.length}
                        </span>
                        <h2 className="text-xl font-medium text-slate-800 leading-relaxed">{currentQ.text}</h2>
                        {currentQ.sessionName && (
                            <span className="inline-block mt-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                                {currentQ.sessionName}
                            </span>
                        )}
                    </div>
                </div>
                {currentQ.manualAnswer && (
                    <div className="mb-4 p-3 bg-slate-50 border-l-4 border-indigo-500 rounded-r-lg">
                        <p className="text-sm text-slate-600 italic">"{currentQ.manualAnswer}"</p>
                    </div>
                )}
                
                <div className="flex justify-between items-center mt-2">
                     <button onClick={prevQuestion} disabled={currentQIndex === 0} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft />
                     </button>
                     <button onClick={nextQuestion} disabled={currentQIndex === questions.length - 1} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronRight />
                     </button>
                </div>
               </>
           ) : (
               <div className="flex flex-col items-center justify-center h-24 text-slate-400">
                   <p>No questions selected or generated.</p>
                   <a href="#/" className="text-indigo-600 hover:underline text-sm font-medium">Go to Dashboard</a>
               </div>
           )}
        </div>

        
        {/* Onboarding Hint: Prep Mode */}
        {showPracticeHint && phase === 'prep' && (
          <OnboardingHint 
            message="Prep for 1 minute. This is not recorded. The last 3 seconds will count down automatically to start recording."
            onDismiss={() => setShowPracticeHint(false)} 
          />
        )}

        {/* Onboarding Hint: Answer Mode */}
        {showPracticeHint && phase === 'answering' && (
           <OnboardingHint 
            message="Recording in progress. You have 2:30 minutes to answer."
            onDismiss={() => setShowPracticeHint(false)} 
          />
        )}


        {/* Camera Container */}
        <div className="bg-black rounded-2xl overflow-hidden relative shadow-lg group aspect-video flex flex-col">
            
            {/* Prep Timer Overlay (Large Centered) */}
            {phase === 'prep' && (
                <div className="absolute inset-0 z-20 bg-black/40 flex flex-col items-center justify-center text-center animate-fade-in">
                    <span className="text-yellow-400 font-bold uppercase tracking-widest mb-4">Preparation Time</span>
                    <div className="text-8xl font-bold text-white tabular-nums tracking-tight">
                        {formatTime(timeLeft)}
                    </div>
                    {timeLeft <= 3 && <p className="text-white mt-4 animate-pulse">Be ready to answer your question</p>}
                </div>
            )}

            {/* Pre-Answer Countdown Overlay */}
             {phase === 'pre-answer' && (
                <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center text-center p-8 animate-pulse">
                    <h3 className="text-3xl text-white font-semibold mb-4">
                        Be ready to answer your question
                    </h3>
                    <h3 className="text-8xl font-bold text-white">{timeLeft}</h3>
                </div>
            )}
            
            <video 
                ref={videoRef} 
                playsInline 
                className={`w-full h-full object-cover ${phase !== 'review' ? 'transform scale-x-[-1]' : ''}`}
            />
            
            {/* Status Badge & Timer (Top Right) - Visible during Answer and Review */}
            {(phase === 'answering' || phase === 'review') && (
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white font-mono text-lg border border-white/10 flex items-center gap-3">
                    {phase === 'answering' && <span className="text-red-400 flex items-center gap-2"><div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"/> REC</span>}
                    {phase === 'review' && <span className="text-green-400">REVIEW</span>}
                    <span className="font-bold border-l border-white/20 pl-3">{formatTime(timeLeft)}</span>
                </div>
            )}

        </div>


        {showNoteHint && (
    <div className="mt-4">
        <OnboardingHint 
            message="Select a recording mode below. 'Complete Session' gives you 60 seconds unrecorded to prepare, followed by 2 minutes and 30 seconds to record your answer. 'Answer Only' begins recording your answer immediately."
            onDismiss={() => setShowNoteHint(false)}
        />
    </div>
)}


        {/* Controls Section */}
<div className="flex flex-col items-center py-4 min-h-[140px] justify-center space-y-6">

  {/* Setup Phase */}
  {phase === 'setup' && (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-bold text-slate-800 mb-4 text-center text-lg">Select Practice Mode</h3>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Complete Session */}
        <label className={`flex-1 cursor-pointer rounded-xl border transition-all p-4 ${mode === 'prep-answer' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              className="w-4 h-4 text-indigo-600 accent-indigo-600 border-gray-300"
              checked={mode === 'prep-answer'}
              onChange={() => setMode('prep-answer')}
            />
            <span className={`font-semibold ${mode === 'prep-answer' ? 'text-indigo-600' : 'text-slate-900'}`}>Complete Session</span>
          </div>
        </label>

        {/* Answer-Only Session */}
        <label className={`flex-1 cursor-pointer rounded-xl border transition-all p-4 ${mode === 'answer-only' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              className="w-4 h-4 text-indigo-600 accent-indigo-600 border-gray-300"
              checked={mode === 'answer-only'}
              onChange={() => setMode('answer-only')}
            />
            <span className={`font-semibold ${mode === 'answer-only' ? 'text-indigo-600' : 'text-slate-900'}`}>Answer-Only Session</span>
          </div>
        </label>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleStartSequence}
          className="flex items-center gap-2 px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-md transition-transform transform hover:scale-105"
        >
          Start Session
        </button>
      </div>
    </div>
  )}

  {/* Prep Phase */}
  {phase === 'prep' && (
    <button
      onClick={() => {
        clearInterval(timerRef.current!);
        startPreAnswer();
      }}
      className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium shadow-md hover:bg-indigo-700 transition-colors"
    >
      Skip preparation and start answering
    </button>
  )}

  {/* Answering Phase */}
  {phase === 'answering' && (
    <button
      onClick={handleStopRecording}
      className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg animate-pulse"
    >
      <Square size={16} fill="currentColor" />
      Stop Recording
    </button>
  )}

  {/* Review Phase */}
  {phase === 'review' && (
    <div className="flex gap-6 justify-center">
      <button className="flex flex-col items-center gap-1 text-indigo-600 hover:text-indigo-800">
        <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
          <Eye size={20} />
        </div>
        <span className="text-xs font-medium">Rewatch</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-indigo-600 hover:text-indigo-800">
        <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
          <RotateCcw size={20} />
        </div>
        <span className="text-xs font-medium">Restart</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-white">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:bg-indigo-700">
          <Save size={20} />
        </div>
        <span className="text-xs font-medium text-slate-900">Save</span>
      </button>
    </div>
  )}
</div>

         {showNoteHint && (
            <div className="mt-4">
                <OnboardingHint 
                    message="Use Notes to brainstorm your answer or take note during session."
                    onDismiss={() => setShowNoteHint(false)}
                />
            </div>
)}

      {/* Notes Section - Below Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Notes</h3>
            <span className="text-xs text-slate-500 italic">{note ? 'Saving...' : 'Auto-saves'}</span>
        </div>
        <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-40 p-4 resize-y focus:outline-none focus:ring-2 focus:ring-black text-black bg-white leading-relaxed text-base"
            placeholder="Type your thoughts, brainstorming ideas, or feedback here..."
        />
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
             <button 
                onClick={handleImportToNotes}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto"
            >
                <FolderInput size={14} />
                Import to Notes
            </button>
        </div>
      </div>
    </div>
  );
};

export default Practice;