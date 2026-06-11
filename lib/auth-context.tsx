'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'employee' | 'finance';

interface AuthContextType {
  isLoggedIn: boolean;
  role: UserRole | null;
  employeeId: string | null;
  userName: string | null;
  userGrade: string | null;
  login: (employeeId: string, role: UserRole) => void;
  logout: () => void;
  register: (employeeId: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyPassword: (employeeId: string, password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock password storage in localStorage (in production, use a real backend)
const getStoredPassword = (employeeId: string) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`password_${employeeId}`);
};

const setStoredPassword = (employeeId: string, password: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`password_${employeeId}`, password);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userGrade, setUserGrade] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize demo passwords on first load (for testing without database)
      const demoInit = localStorage.getItem('demo_init');
      if (!demoInit) {
        setStoredPassword('EMP001', 'demo123');
        setStoredPassword('EMP002', 'demo123');
        setStoredPassword('EMP003', 'demo123');
        setStoredPassword('202324', 'demo123');
        localStorage.setItem('demo_init', 'true');
      }

      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const { employeeId: id, role: userRole, userName: name, userGrade: grade } = JSON.parse(stored);
          setEmployeeId(id);
          setRole(userRole);
          setIsLoggedIn(true);
          setUserName(name);
          setUserGrade(grade);
        } catch (e) {
          console.error('Failed to restore session:', e);
        }
      }
    }
  }, []);

  const login = (id: string, userRole: UserRole) => {
    // Import employee data
    const { employeeDatabase } = require('./store');
    const employee = employeeDatabase[id];
    
    setEmployeeId(id);
    setRole(userRole);
    setUserName(employee?.name || 'Employee');
    setUserGrade(employee?.grade || '');
    setIsLoggedIn(true);

    // Persist session
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify({
        employeeId: id,
        role: userRole,
        userName: employee?.name || 'Employee',
        userGrade: employee?.grade || '',
      }));
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRole(null);
    setEmployeeId(null);
    setUserName(null);
    setUserGrade(null);

    // Clear session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
  };

  const register = async (id: string, email: string, password: string) => {
    // Import employee database
    const { employeeDatabase } = require('./store');
    const employee = employeeDatabase[id];

    if (!employee) {
      return { success: false, error: 'Employee ID not found in database' };
    }

    if (email !== employee.email) {
      return { success: false, error: 'Email does not match employee record' };
    }

    // Store password (in production, hash with bcrypt on backend)
    setStoredPassword(id, password);

    // Mark as activated
    if (typeof window !== 'undefined') {
      localStorage.setItem(`activated_${id}`, 'true');
    }

    return { success: true };
  };

  const verifyPassword = (id: string, password: string) => {
    const stored = getStoredPassword(id);
    if (!stored) return false;
    // In production, use bcrypt.compare()
    return stored === password;
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      role,
      employeeId,
      userName,
      userGrade,
      login,
      logout,
      register,
      verifyPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
