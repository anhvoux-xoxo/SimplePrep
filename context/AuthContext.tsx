import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  verifyUser: (email: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session
    const savedUser = localStorage.getItem('simpleprep_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const users = JSON.parse(localStorage.getItem('simpleprep_users') || '[]');
    const found = users.find((u: any) => u.email === email && u.pass === pass);
    
    if (found) {
      if (!found.isVerified) {
        throw new Error("Please verify your email address to log in.");
      }
      const userData = { id: found.id, email: found.email, isVerified: found.isVerified };
      localStorage.setItem('simpleprep_current_user', JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error("Invalid email or password");
    }
  };

  const signup = async (email: string, pass: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const users = JSON.parse(localStorage.getItem('simpleprep_users') || '[]');
    if (users.find((u: any) => u.email === email)) {
      throw new Error("User already exists");
    }
    
    // Create new user with isVerified: false
    const newUser = { id: Math.random().toString(36).substr(2, 9), email, pass, isVerified: false };
    users.push(newUser);
    localStorage.setItem('simpleprep_users', JSON.stringify(users));
    
    // Do NOT automatically log in or set user session
    // Just return success implies email sent
  };
  
  const verifyUser = (email: string) => {
      const users = JSON.parse(localStorage.getItem('simpleprep_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
          users[userIndex].isVerified = true;
          localStorage.setItem('simpleprep_users', JSON.stringify(users));
      }
  };

  const logout = () => {
    localStorage.removeItem('simpleprep_current_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, verifyUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);