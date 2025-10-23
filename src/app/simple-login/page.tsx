"use client";

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';

export default function SimpleLoginPage() {
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
    type: 'student_id'
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      console.log("🚀 Attempting login with:", {
        identifier: credentials.identifier,
        type: credentials.type,
        hasPassword: !!credentials.password
      });

      const result = await signIn('credentials', {
        identifier: credentials.identifier,
        password: credentials.password,
        type: credentials.type,
        redirect: false,
      });

      console.log("📋 SignIn result:", result);

      if (result?.error) {
        setResult({
          success: false,
          error: result.error,
          details: result
        });
      } else if (result?.ok) {
        // Get session to confirm login
        const session = await getSession();
        setResult({
          success: true,
          message: "Login successful!",
          session: session
        });
      } else {
        setResult({
          success: false,
          error: "Unknown error occurred",
          details: result
        });
      }

    } catch (error) {
      console.error("❌ Login error:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Simple Login Test
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Test NextAuth credentials login
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Login Type
            </label>
            <select
              value={credentials.type}
              onChange={(e) => setCredentials({...credentials, type: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="student_id">Student ID</option>
              <option value="username">Username (Admin)</option>
              <option value="national_id">National ID</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Identifier
            </label>
            <input
              type="text"
              required
              value={credentials.identifier}
              onChange={(e) => setCredentials({...credentials, identifier: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter student ID, username, or national ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter password"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        </form>

        {result && (
          <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? 'Success!' : 'Error!'}
            </h3>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/test-auth"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            Go to Debug Page
          </a>
        </div>
      </div>
    </div>
  );
}