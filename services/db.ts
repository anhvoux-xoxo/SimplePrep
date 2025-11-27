import { Question, Recording, Note } from '../types';

const DB_NAME = 'SimplePrepDB';
const DB_VERSION = 1;

export const STORES = {
  QUESTIONS: 'questions',
  RECORDINGS: 'recordings',
  NOTES: 'notes',
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
        db.createObjectStore(STORES.QUESTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.RECORDINGS)) {
        db.createObjectStore(STORES.RECORDINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
      }
    };
  });
};

// Generic get all with User ID filtering
export const getAll = async <T extends { userId?: string }>(storeName: string, userId?: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
        const results = request.result as T[];
        if (userId) {
            resolve(results.filter(item => item.userId === userId));
        } else {
            // Guest mode: only show items without a userId
            resolve(results.filter(item => !item.userId));
        }
    };
    request.onerror = () => reject(request.error);
  });
};

// Generic add/put
export const saveItem = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic delete
export const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Specific helpers
export const getQuestions = (userId?: string) => getAll<Question>(STORES.QUESTIONS, userId);
export const saveQuestion = (q: Question) => saveItem(STORES.QUESTIONS, q);
export const deleteQuestion = (id: string) => deleteItem(STORES.QUESTIONS, id);

export const getRecordings = (userId?: string) => getAll<Recording>(STORES.RECORDINGS, userId);
export const saveRecording = (r: Recording) => saveItem(STORES.RECORDINGS, r);
export const deleteRecording = (id: string) => deleteItem(STORES.RECORDINGS, id);

export const getNote = async (id: string, userId?: string): Promise<Note | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.NOTES, 'readonly');
        const store = transaction.objectStore(STORES.NOTES);
        const request = store.get(id);
        request.onsuccess = () => {
            const res = request.result as Note;
            // Validate ownership
            if (res) {
                if (userId && res.userId === userId) resolve(res);
                else if (!userId && !res.userId) resolve(res);
                else resolve(undefined);
            } else {
                resolve(undefined);
            }
        };
        request.onerror = () => reject(request.error);
    });
}
export const getNotes = (userId?: string) => getAll<Note>(STORES.NOTES, userId);
export const saveNote = (n: Note) => saveItem(STORES.NOTES, n);
export const deleteNote = (id: string) => deleteItem(STORES.NOTES, id);