import React, { useState, useEffect } from 'react';
import { Note, Question } from '../types';
import { getNotes, saveNote, getQuestions, deleteNote } from '../services/db';
import { Plus, NotebookPen, Calendar, FileText, X, Save, Trash2, Bookmark } from 'lucide-react';
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

  // Load Material Symbols font
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=bookmark';
    
    const style = document.createElement('style');
    style.textContent = `
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
    `;
    
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      document.head.appendChild(link);
    }
    if (!document.querySelector('style[data-material-symbols]')) {
      style.setAttribute('data-material-symbols', 'true');
      document.head.appendChild(style);
    }
  }, []);

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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">New Note</h3>
          </div>
          <div className="p-6">
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
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                <Bookmark size={18} />
                Save Note
              </button>
            </div>
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
                className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all ${isExpanded ? 'md:col-span-2' : ''} ${!isExpanded ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                onClick={() => !isExpanded && startEditing(note, displayTitle)}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isManual ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {isManual ? <NotebookPen size={18} /> : <FileText size={18} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{displayTitle}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(note.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                 
                <button 
                  onClick={(e) => handleDelete(note.id, e)}
                  className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                  title="Delete Note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {isExpanded ? (
                    <div className="flex flex-col gap-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                         <div>
                           <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Title</label>
                           <input 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg text-black bg-white font-medium focus:ring-2 focus:ring-black"
                                placeholder="Title"
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Content</label>
                           <textarea 
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-4 border border-slate-300 rounded-lg text-black bg-white text-base leading-relaxed resize-y min-h-[200px] focus:ring-2 focus:ring-black"
                                placeholder="Content"
                           />
                         </div>
                         <div className="flex justify-end gap-2 mt-2">
                             <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                             >
                                 Cancel
                             </button>
                             <button 
                                  onClick={(e) => { e.stopPropagation(); saveEdit(note); }}
                                  className="flex items-center gap-2 px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200"
                             >
                                 <Bookmark size={16} />
                                 Save
                             </button>
                         </div>
                    </div>
                ) : (
                    <div className="bg-white">
                        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed line-clamp-4">
                            {note.content}
                        </p>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notes;