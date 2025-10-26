"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    const router = useRouter();

    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Application Error:", error);
    }, [error]);

    const handleGoHome = () => {
        router.push("/");
    };

    const handleReset = () => {
        reset();
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-flex tw-items-center tw-justify-center tw-px-6">
            <div className="tw-text-center tw-max-w-md tw-mx-auto">
                {/* Error Icon */}
                <div className="tw-mb-8">
                    <div className="tw-w-20 tw-h-20 tw-bg-gradient-to-br tw-from-red-500 tw-to-red-600 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-6 tw-shadow-lg">
                        <AlertTriangle className="tw-w-10 tw-h-10 tw-text-white" />
                    </div>
                    <div className="tw-w-24 tw-h-1 tw-bg-gradient-to-r tw-from-red-500 tw-to-orange-500 tw-rounded-full tw-mx-auto"></div>
                </div>

                {/* Error Message */}
                <h1 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-mb-4">
                    เกิดข้อผิดพลาดขึ้น
                </h1>
                <p className="tw-text-gray-600 tw-mb-8 tw-leading-relaxed">
                    ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิดขึ้น
                    <br />
                    กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้าหลัก
                </p>

                {/* Error Details (Development only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="tw-mb-8 tw-p-4 tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-text-left">
                        <h3 className="tw-text-sm tw-font-semibold tw-text-red-800 tw-mb-2">
                            Error Details (Development):
                        </h3>
                        <p className="tw-text-xs tw-text-red-700 tw-font-mono tw-break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="tw-text-xs tw-text-red-600 tw-mt-1">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="tw-flex tw-flex-col tw-sm:tw-flex-row tw-gap-4 tw-justify-center">
                    <Button
                        onClick={handleReset}
                        className="
    tw-px-6 tw-py-3 
    tw-bg-gradient-to-r tw-from-blue-600 tw-to-purple-600
    tw-text-white tw-font-medium 
    tw-rounded-xl 
    tw-shadow-lg hover:tw-shadow-xl 
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    focus:tw-outline-none focus:tw-ring-0 active:tw-ring-0
    tw-border-0 tw-appearance-none
    tw-[-webkit-tap-highlight-color:transparent]
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
  "
                    >
                        <RefreshCw className="tw-w-5 tw-h-5 tw-transition-transform group-hover:tw-rotate-180 tw-duration-300" />
                        ลองใหม่
                    </Button>

                    <Button
                        onClick={handleGoHome}
                        variant="secondary"
                        className="
    tw-px-6 tw-py-3 
    tw-bg-white tw-text-gray-700 tw-font-medium 
    tw-rounded-xl tw-border tw-border-gray-200 
    tw-shadow-sm hover:tw-shadow-md
    hover:tw-bg-gray-50 active:tw-bg-gray-100
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    focus:tw-outline-none focus:tw-ring-0 active:tw-ring-0
    tw-appearance-none
    tw-[-webkit-tap-highlight-color:transparent]
  "
                    >
                        <Home className="tw-w-5 tw-h-5 tw-text-gray-600" />
                        กลับหน้าหลัก
                    </Button>

                </div>

                {/* Additional Help */}
                <div className="tw-mt-12 tw-p-6 tw-bg-white tw-rounded-2xl tw-shadow-sm tw-border tw-border-gray-100">
                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-3">
                        ปัญหายังไม่หายไป?
                    </h3>
                    <p className="tw-text-sm tw-text-gray-600 tw-mb-4">
                        หากปัญหายังคงเกิดขึ้น กรุณาติดต่อทีมสนับสนุน
                    </p>
                    <div className="tw-flex tw-justify-center tw-space-x-4 tw-text-sm">
                        <a
                            href="mailto:support@ku.th"
                            className="tw-text-blue-600 hover:tw-text-blue-700 tw-transition-colors"
                        >
                            support@ku.th
                        </a>
                        <span className="tw-text-gray-400">|</span>
                        <a
                            href="tel:+6621234567"
                            className="tw-text-blue-600 hover:tw-text-blue-700 tw-transition-colors"
                        >
                            02-123-4567
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}