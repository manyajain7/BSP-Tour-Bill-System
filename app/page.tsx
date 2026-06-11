'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'employee' | 'finance'>('employee');
  const [error, setError] = useState('');
  const { login, verifyPassword } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    setError('');
    if (!employeeId.trim() || !password.trim()) {
      setError('Please enter both Employee ID and password');
      return;
    }

    if (!verifyPassword(employeeId, password)) {
      setError('Invalid Employee ID or password');
      return;
    }

    login(employeeId, selectedRole);
    router.push(selectedRole === 'employee' ? '/employee' : '/finance');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">BSP Tour Bill System</h1>
        <p className="text-center text-gray-600 mb-8">Login to your account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Employee ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., EMP001 or 202324"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Role</label>
            <div className="space-y-2">
              {(['employee', 'finance'] as const).map((role) => (
                <label key={role} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value as 'employee' | 'finance')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-gray-700 capitalize">{role}</span>
                  <span className="ml-auto text-sm text-gray-500">
                    {role === 'employee' ? 'Submit tour bills' : 'Review & approve bills'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
          >
            Login
          </Button>
        </div>

        {/* Registration & Links */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-sm text-center">
          <div>
            <p className="text-gray-600">First time user?</p>
            <Link
              href="/activate"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Activate Account
            </Link>
          </div>
          <div>
            <Link
              href="/forgot-password"
              className="text-gray-600 hover:text-gray-700"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6 p-3 bg-blue-50 rounded">
          <strong>Demo Credentials:</strong><br/>
          Employee ID: <code className="bg-white px-1 py-0.5 rounded">EMP001</code>, <code className="bg-white px-1 py-0.5 rounded">EMP002</code>, or <code className="bg-white px-1 py-0.5 rounded">202324</code><br/>
          Password: <code className="bg-white px-1 py-0.5 rounded">demo123</code>
        </p>
      </div>
    </div>
  );
}
