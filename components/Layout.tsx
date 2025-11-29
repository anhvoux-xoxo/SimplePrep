import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Hexagon, User, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ to, iconName, label }: { to: string; iconName: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`
    }
  >
    <span className="material-symbols-outlined">{iconName}</span>
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) / Navbar (Mobile) */}
      <aside className="bg-white md:w-64 md:h-screen md:fixed md:left-0 md:top-0 border-r border-slate-200 z-20 flex flex-col justify-between shadow-sm">
        <div>
          <div className="p-6 flex items-center gap-2 border-b border-slate-100">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Hexagon size={24} fill="currentColor" className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">SimplePrep</h1>
          </div>

          <nav className="p-4 space-y-1">
            <NavItem to="/" iconName="dashboard_customize" label="Dashboard" />
            <NavItem to="/practice" iconName="videocam" label="Practice" />
            <NavItem to="/recorded" iconName="history_2" label="Recorded" />
            <NavItem to="/notes" iconName="note_stack_add" label="Notes" />
          </nav>
        </div>

        <div className="p-4 space-y-4">
            {/* User Profile / Login Link */}
            {user ? (
                 <NavLink 
                    to="/profile"
                    className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors ${isActive ? 'ring-2 ring-indigo-200' : ''}`}
                 >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={16} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-700 truncate">My Account</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                 </NavLink>
            ) : (
                <NavLink 
                    to="/login"
                    className="flex items-center justify-center gap-2 p-3 w-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all font-medium text-sm"
                >
                    <LogIn size={16} />
                    <span>Login / Sign Up</span>
                </NavLink>
            )}

        
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
            <div className="flex items-center gap-2 mb-6 text-slate-400">
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  title="Back"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => navigate(1)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  title="Forward"
                >
                  <ChevronRight size={20} />
                </button>
            </div>
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;