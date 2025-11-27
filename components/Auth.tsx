import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Phone, Globe, CheckCircle } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  
  const { login, signup, verifyUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await login(email, pass);
        navigate('/');
      } else {
        await signup(email, pass);
        setVerificationSent(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const handleSimulateVerification = () => {
      // Logic to simulate clicking email link
      verifyUser(email);
      alert("Email verified! You can now log in.");
      setVerificationSent(false);
      setIsLogin(true);
  };

  if (verificationSent) {
      return (
        <div className="flex items-center justify-center min-h-[80vh] px-4">
             <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                 <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Mail size={32} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Your Email</h2>
                 <p className="text-slate-600 mb-6">
                     We've sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
                 </p>
                 <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500 mb-6">
                     User cannot access the Dashboard until verification is complete.
                 </div>
                 
                 {/* Simulation Button for Demo */}
                 <button 
                    onClick={handleSimulateVerification}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-200 mb-4"
                 >
                     (Demo) Simulate Verify Click
                 </button>
                 
                 <button 
                    onClick={() => setVerificationSent(false)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                 >
                     Back to Login
                 </button>
             </div>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-black"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-black"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        
        {/* Additional Sign Up Options */}
        <div className="mt-6 space-y-3">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400">Or continue with</span>
                </div>
            </div>

            <button className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Globe size={18} className="text-slate-600" />
                Sign in with Google
            </button>
            
            <button className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Phone size={18} className="text-slate-600" />
                {isLogin ? 'Sign in' : 'Sign up'} with Phone Number
            </button>
        </div>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
        
        {isLogin && (
            <div className="mt-2 text-center">
                <button className="text-slate-400 hover:text-slate-600 text-xs">Forgot Password?</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;