"use client";

import { useState } from 'react';

export default function TestAuthPage() {
    const [debugResult, setDebugResult] = useState<any>(null);
    const [testResult, setTestResult] = useState<any>(null);
    const [loginData, setLoginData] = useState({
        identifier: '',
        password: '',
        type: 'student_id'
    });

    const testDebug = async () => {
        try {
            const response = await fetch('/api/auth/debug');
            const data = await response.json();
            setDebugResult(data);
        } catch (error) {
            setDebugResult({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    const testLogin = async () => {
        try {
            const response = await fetch('/api/auth/test-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });
            const data = await response.json();
            setTestResult(data);
        } catch (error) {
            setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    const testNextAuthLogin = async () => {
        try {
            const { signIn } = await import('next-auth/react');
            const result = await signIn('credentials', {
                identifier: loginData.identifier,
                password: loginData.password,
                type: loginData.type,
                redirect: false,
            });
            setTestResult({ nextAuthResult: result });
        } catch (error) {
            setTestResult({ nextAuthError: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">NextAuth Debug Page</h1>

            {/* Debug System */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-4">System Debug</h2>
                <button
                    onClick={testDebug}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Test System
                </button>
                {debugResult && (
                    <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-sm">
                        {JSON.stringify(debugResult, null, 2)}
                    </pre>
                )}
            </div>

            {/* Test Login */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-4">Test Login</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Identifier (รหัสนิสิต/username)"
                        value={loginData.identifier}
                        onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <select
                        value={loginData.type}
                        onChange={(e) => setLoginData({ ...loginData, type: e.target.value })}
                        className="border p-2 rounded"
                    >
                        <option value="student_id">Student ID</option>
                        <option value="username">Username</option>
                        <option value="national_id">National ID</option>
                    </select>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={testLogin}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        Test Direct Login
                    </button>
                    <button
                        onClick={testNextAuthLogin}
                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    >
                        Test NextAuth Login
                    </button>
                </div>

                {testResult && (
                    <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-sm">
                        {JSON.stringify(testResult, null, 2)}
                    </pre>
                )}
            </div>

            {/* Instructions */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>First, click "Test System" to check if everything is configured correctly</li>
                    <li>Enter valid credentials (student ID or username and password)</li>
                    <li>Click "Test Direct Login" to test the authentication logic directly</li>
                    <li>If that works, click "Test NextAuth Login" to test through NextAuth</li>
                    <li>Check the browser console for additional debug information</li>
                </ol>
            </div>
        </div>
    );
}