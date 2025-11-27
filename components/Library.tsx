import React, { useEffect, useState } from 'react';
import { Play, Trash2, Calendar, Clock, FileText, Save, Copy, FolderPlus } from 'lucide-react';
import { Recording } from '../types';
import { getRecordings, deleteRecording, getNotes, saveNote } from '../services/db';
import { useAuth } from '../context/AuthContext';

const Library: React.FC = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({}); // Map questionId -> note content
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadLibraryData();
  }, [user]);

  const loadLibraryData = async () => {
    try {
      const [recs, allNotes] = await Promise.all([getRecordings(user?.id), getNotes(user?.id)]);
      
      setRecordings(recs.sort((a, b) => b.createdAt - a.createdAt));
      
      const notesMap: Record<string, string> = {};
      allNotes.forEach(n => {
          notesMap[n.id] = n.content;
      });
      setNotes(notesMap);

    } catch (e) {
      console.error("Failed loading library", e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Immediate removal without confirmation as requested
    setRecordings(prev => prev.filter(r => r.id !== id));
    await deleteRecording(id);
  };

  const handleNoteChange = (questionId: string, content: string) => {
      setNotes(prev => ({ ...prev, [questionId]: content }));
  };

  const handleNoteBlur = async (questionId: string, content: string) => {
      // Save on blur
      if (!questionId) return;
      await saveNote({
          id: questionId,
          userId: user?.id,
          sessionId: 'default',
          content: content,
          lastUpdated: Date.now()
      });
  };

  const copyToClipboard = (text: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      alert("Note copied to clipboard!");
  };

  const addToNotes = async (rec: Recording, content: string) => {
      if (!content) return;
      // Save as a new manual note
      await saveNote({
          id: Math.random().toString(36).substr(2, 9),
          userId: user?.id,
          sessionId: 'manual',
          title: `Copy of: ${rec.questionText || 'Recorded Session'}`,
          content: content,
          lastUpdated: Date.now()
      });
      alert("Added to Notes page!");
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Recorded</h2>
        <p className="text-slate-500">Review your past practice sessions and notes.</p>
      </header>

      {recordings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="text-slate-400 mb-2">No recordings found.</div>
            <a href="#/practice" className="text-indigo-600 font-medium hover:underline">Go to Practice</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {recordings.map((rec) => {
            const currentNote = (rec.questionId && notes[rec.questionId]) || "";
            
            return (
                <div key={rec.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                    {/* Video Section */}
                    <div className="md:w-1/3 bg-slate-900 relative aspect-video md:aspect-auto min-h-[250px]">
                        {playingId === rec.id ? (
                            <video 
                                src={rec.downloadUrl || URL.createObjectURL(rec.blob)} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                                onEnded={() => setPlayingId(null)}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-slate-900">
                                <button 
                                    onClick={() => setPlayingId(rec.id)}
                                    className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all transform hover:scale-110"
                                >
                                    <Play fill="currentColor" size={24} className="ml-1" />
                                </button>
                                <span className="mt-3 text-xs font-mono tracking-wider">{formatDuration(rec.duration)}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-slate-800 text-lg leading-snug">
                                    {rec.questionText || "Freestyle Session"}
                                </h3>
                                <button 
                                    onClick={(e) => handleDelete(rec.id, e)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 -mr-2"
                                    title="Delete Recording"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(rec.createdAt).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(rec.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            {/* Editable Note Area - Updated with Nav Colors */}
                            <div className="bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100">
                                    <div className="flex items-center gap-2 text-indigo-700 font-medium text-xs uppercase tracking-wide">
                                        <FileText size={14} />
                                        <span>Notes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => copyToClipboard(currentNote)} 
                                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                            title="Copy"
                                        >
                                            <Copy size={14} />
                                            <span className="text-xs">Copy</span>
                                        </button>
                                        <button 
                                            onClick={() => addToNotes(rec, currentNote)} 
                                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                            title="Add to Notes"
                                        >
                                            <FolderPlus size={14} />
                                            <span className="text-xs">Add to Notes</span>
                                        </button>
                                    </div>
                                </div>
                                <textarea 
                                    className="w-full p-4 bg-transparent border-none focus:ring-0 text-slate-700 text-sm leading-relaxed resize-y h-32"
                                    placeholder="Add notes for this recording here..."
                                    value={currentNote}
                                    onChange={(e) => rec.questionId && handleNoteChange(rec.questionId, e.target.value)}
                                    onBlur={(e) => rec.questionId && handleNoteBlur(rec.questionId, e.target.value)}
                                    disabled={!rec.questionId}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;