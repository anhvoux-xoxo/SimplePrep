export enum QuestionCategory {
  COMPLETE_SESSION = 'Complete Session',
  BACKGROUND = 'Background',
  BEHAVIORAL = 'Situational/Behavioral',
  TECHNICAL = 'Technical',
}

export interface Question {
  id: string;
  userId?: string; // Linked to user account
  text: string;
  category: QuestionCategory;
  manualAnswer?: string; // Optional user-provided answer/talking points
  aiGenerated: boolean;
  createdAt: number;
  isSaved?: boolean;       // Bookmark
  isStarred?: boolean;     // Starred
  lastPracticedAt?: number;
  sessionName?: string;    // Name of the interview session
}

export interface Note {
  id: string;
  userId?: string; // Linked to user account
  sessionId: string; // Could be question ID or a general practice session ID
  title?: string;
  content: string;
  lastUpdated: number;
}

export interface Recording {
  id: string;
  userId?: string; // Linked to user account
  questionId: string | null; // Null if it's a general freestyle recording
  questionText?: string;
  blob: Blob;
  thumbnailUrl?: string; // Generated on save
  downloadUrl?: string; // Optional URL for remote storage
  duration: number; // in seconds
  createdAt: number;
}

export interface AppState {
  questions: Question[];
  recordings: Recording[];
  currentJobDescription: string;
}

export type StorageSchema = {
  questions: Question;
  recordings: Recording;
  notes: Note;
};