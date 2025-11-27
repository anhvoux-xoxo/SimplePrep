import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Practice from './components/Practice';
import Library from './components/Library';
import Notes from './components/Notes';
import AuthPage from './components/Auth';
import Profile from './components/Profile';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/recorded" element={<Library />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;