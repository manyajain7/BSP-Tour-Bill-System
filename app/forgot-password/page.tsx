'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">BSP Tour Bill System</h1>
        <p className="text-center text-gray-600 mb-8">Password Reset</p>

        <div className="space-y-6 text-center">
          <p className="text-gray-700">
            To reset your password, please contact your HR administrator or system support.
          </p>
          <p className="text-sm text-gray-600">
            HR Department Email: <span className="font-semibold">hr@bsp.sail.in</span>
          </p>

          <Link href="/">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
