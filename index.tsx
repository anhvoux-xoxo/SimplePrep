import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { clearAllData } from './services/db'; // <-- IMPORT THE NEW CLEAR FUNCTION

// Wrap the rendering logic in an async function to ensure the database is cleared first
const initializeApp = async () => {
  // START: MODIFIED BLOCK - CLEARS DB ON EVERY STARTUP
  try {
    // Delete the entire IndexedDB before the application attempts to load any saved data
    await clearAllData();
  } catch (e) {
    // If clearing fails (e.g., database is open), log the error but allow the app to run
    console.error("Failed to clear IndexedDB on startup:", e);
  }
  // END: MODIFIED BLOCK

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

initializeApp(); // <-- Call the initialization function to start the app