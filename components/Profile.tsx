import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div className="text-center p-10">Please login.</div>;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <User size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
                <p className="text-slate-500">{user.email}</p>
            </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold text-slate-700 mb-4">Account Settings</h3>
            <p className="text-sm text-slate-500 mb-6">
                Your data is automatically synced to this account. You can access your questions, notes, and recordings from any device by logging in.
            </p>
            
            <button 
                onClick={handleLogout}
                className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2 font-medium"
            >
                <LogOut size={18} />
                Logout
            </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;