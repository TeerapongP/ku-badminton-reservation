"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function BannerDebugPage() {
    const { data: session, status } = useSession();
    const [testResult, setTestResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runTest = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/banners/test');
            const data = await response.json();
            setTestResult({
                status: response.status,
                data: data
            });
        } catch (error) {
            setTestResult({
                status: 'ERROR',
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            runTest();
        }
    }, [session]);

    if (status === "loading") {
        return <div className="tw-p-8">กำลังโหลด session...</div>;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gray-50 tw-p-8">
            <div className="tw-max-w-4xl tw-mx-auto">
                <h1 className="tw-text-3xl tw-font-bold tw-mb-6">Banner Management Debug</h1>

                {/* Session Info */}
                <div className="tw-bg-white tw-rounded-lg tw-shadow tw-p-6 tw-mb-6">
                    <h2 className="tw-text-xl tw-font-semibold tw-mb-4">Session Information</h2>
                    <pre className="tw-bg-gray-100 tw-p-4 tw-rounded tw-text-sm tw-overflow-auto">
                        {JSON.stringify({
                            status,
                            user: session?.user ? {
                                id: session.user.id,
                                username: session.user.username,
                                role: session.user.role,
                                email: session.user.email
                            } : null
                        }, null, 2)}
                    </pre>
                </div>

                {/* Test Results */}
                <div className="tw-bg-white tw-rounded-lg tw-shadow tw-p-6 tw-mb-6">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                        <h2 className="tw-text-xl tw-font-semibold">API Test Results</h2>
                        <button
                            onClick={runTest}
                            disabled={isLoading}
                            className="tw-px-4 tw-py-2 tw-bg-blue-600 tw-text-white tw-rounded hover:tw-bg-blue-700 disabled:tw-opacity-50"
                        >
                            {isLoading ? 'กำลังทดสอบ...' : 'ทดสอบใหม่'}
                        </button>
                    </div>

                    {testResult ? (
                        <div>
                            <div className={`tw-inline-block tw-px-3 tw-py-1 tw-rounded tw-text-sm tw-font-medium tw-mb-4 ${testResult.status === 200 ? 'tw-bg-green-100 tw-text-green-800' : 'tw-bg-red-100 tw-text-red-800'
                                }`}>
                                Status: {testResult.status}
                            </div>
                            <pre className="tw-bg-gray-100 tw-p-4 tw-rounded tw-text-sm tw-overflow-auto">
                                {JSON.stringify(testResult.data, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="tw-text-gray-500">กำลังโหลดผลการทดสอบ...</div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="tw-bg-white tw-rounded-lg tw-shadow tw-p-6">
                    <h2 className="tw-text-xl tw-font-semibold tw-mb-4">Quick Actions</h2>
                    <div className="tw-space-y-2">
                        <a
                            href="/admin/banners"
                            className="tw-inline-block tw-px-4 tw-py-2 tw-bg-green-600 tw-text-white tw-rounded hover:tw-bg-green-700"
                        >
                            ไปหน้าจัดการ Banner
                        </a>
                        <br />
                        <a
                            href="/admin"
                            className="tw-inline-block tw-px-4 tw-py-2 tw-bg-gray-600 tw-text-white tw-rounded hover:tw-bg-gray-700"
                        >
                            กลับไป Admin Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}