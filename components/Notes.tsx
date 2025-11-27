import React, { useState, useEffect } from 'react';
import { Note, Question } from '../types';
import { getNotes, saveNote, getQuestions, deleteNote } from '../services/db';
import { Plus, NotebookPen, Calendar, FileText, X, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Notes: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [showAdd, setShowAdd] = useState(false);
  
  // New Note State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Editing State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [fetchedNotes, fetchedQuestions] = await Promise.all([
        getNotes(user?.id),
        getQuestions(user?.id)
      ]);

      setNotes(fetchedNotes.sort((a, b) => b.lastUpdated - a.lastUpdated));

      const qMap: Record<string, Question> = {};
      fetchedQuestions.forEach(q => {
        qMap[q.id] = q;
      });
      setQuestions(qMap);
    } catch (e) {
      console.error("Error loading notes", e);
    }
  };

  const handleSaveManualNote = async () => {
    if (!newNoteContent.trim()) return;

    const note: Note = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id,
      sessionId: 'manual',
      title: newNoteTitle || 'Untitled Note',
      content: newNoteContent,
      lastUpdated: Date.now()
    };

    await saveNote(note);
    setNewNoteTitle('');
    setNewNoteContent('');
    setShowAdd(false);
    loadData();
  };

  const startEditing = (note: Note, qText: string) => {
      if (expandedId === note.id) {
          setExpandedId(null); // Collapse
      } else {
          setExpandedId(note.id);
          setEditTitle(note.title || qText);
          setEditContent(note.content);
      }
  };

  const saveEdit = async (note: Note) => {
      const updatedNote: Note = {
          ...note,
          title: editTitle,
          content: editContent,
          lastUpdated: Date.now()
      };
      await saveNote(updatedNote);
      setExpandedId(null);
      loadData();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Immediate removal without confirmation as requested
      setNotes(prev => prev.filter(n => n.id !== id));
      await deleteNote(id);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notes</h2>
          <p className="text-slate-500">All your session notes and brainstorms.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          {showAdd ? <X size={18} /> : <Plus size={18} />}
          <span>{showAdd ? 'Cancel' : 'Add Note'}</span>
        </button>
      </header>

      {/* Manual Add Form */}
      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">New Note</h3>
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-black text-black bg-white font-medium"
            placeholder="Title"
          />
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black resize-y text-black bg-white text-base mb-4"
            placeholder="Write your note here..."
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveManualNote}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.length === 0 && !showAdd && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No notes found. Start a practice session or add one manually.
          </div>
        )}
        
        {notes.map(note => {
          const question = questions[note.id]; 
          // Use note title if exists, otherwise question text, otherwise fallback
          const displayTitle = note.title || (question ? question.text : "Manual Note / Freestyle");
          const isManual = !question && note.sessionId === 'manual';
          const isExpanded = expandedId === note.id;

          return (
            <div 
                key={note.id} 
                className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all flex flex-col cursor-pointer ${isExpanded ? 'ring-2 ring-indigo-100' : 'hover:border-indigo-300'}`}
                onClick={() => !isExpanded && startEditing(note, displayTitle)}
            >
              <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isManual ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {isManual ? <NotebookPen size={20} /> : <FileText size={20} />}
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(note.lastUpdated).toLocaleDateString()}
                    </span>
                 </div>
                 
                 <button 
                    onClick={(e) => handleDelete(note.id, e)}
                    className="text-slate-300 hover:text-red-500 p-1"
                    title="Delete Note"
                 >
                    <Trash2 size={16} />
                 </button>
              </div>
              
              {isExpanded ? (
                  <div className="flex-1 flex flex-col gap-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                       <input 
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded text-black bg-white font-semibold"
                            placeholder="Title"
                       />
                       <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full flex-1 p-2 border border-slate-300 rounded text-black bg-white text-sm leading-relaxed resize-y min-h-[150px]"
                            placeholder="Content"
                       />
                       <div className="flex justify-end gap-2 mt-2">
                           <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
                           >
                               Cancel
                           </button>
                           <button 
                                onClick={(e) => { e.stopPropagation(); saveEdit(note); }}
                                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                           >
                               <Save size={14} />
                               Save
                           </button>
                       </div>
                  </div>
              ) : (
                  <>
                    <h3 className="font-semibold text-slate-800 mb-3 line-clamp-2 min-h-[1.5em]" title={displayTitle}>
                        {displayTitle}
                    </h3>
                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed font-normal line-clamp-4">
                            {note.content}
                        </p>
                    </div>
                  </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notes;