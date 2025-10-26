"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Home, ArrowLeft, RefreshCw } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        // Auto redirect to home page after 5 seconds
        const timer = setTimeout(() => {
            router.push("/");
        }, 5000);

        return () => clearTimeout(timer);
    }, [router]);

    const handleGoHome = () => {
        router.push("/");
    };

    const handleGoBack = () => {
        router.back();
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-flex tw-items-center tw-justify-center tw-px-6">
            <div className="tw-text-center tw-max-w-md tw-mx-auto">
                {/* 404 Animation */}
                <div className="tw-mb-8">
                    <div className="tw-text-8xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-via-purple-600 tw-to-indigo-600 tw-bg-clip-text tw-text-transparent tw-mb-4">
                        404
                    </div>
                    <div className="tw-w-24 tw-h-1 tw-bg-gradient-to-r tw-from-blue-500 tw-to-purple-500 tw-rounded-full tw-mx-auto tw-mb-6"></div>
                </div>

                {/* Error Message */}
                <h1 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-mb-4">
                    ไม่พบหน้าที่คุณต้องการ
                </h1>
                <p className="tw-text-gray-600 tw-mb-8 tw-leading-relaxed">
                    ขออภัย หน้าที่คุณกำลังมองหาไม่มีอยู่ หรืออาจถูกย้ายไปแล้ว
                    <br />
                    <span className="tw-text-sm tw-text-blue-600">
                        กำลังนำคุณกลับหน้าหลักใน 5 วินาที...
                    </span>
                </p>

                {/* Action Buttons */}
                <div className="tw-flex tw-flex-col tw-sm:tw-flex-row tw-gap-4 tw-justify-center">
                    {/* <Button
                        onClick={handleGoHome}
                        className="tw-px-6 tw-py-3 tw-bg-gradient-to-r tw-from-blue-600 tw-to-purple-600 tw-text-white tw-font-medium tw-rounded-xl tw-shadow-lg hover:tw-shadow-xl tw-transition-all tw-duration-200 tw-flex tw-items-center tw-justify-center tw-gap-2"
                    >
                        <Home className="tw-w-5 tw-h-5" />
                        กลับหน้าหลัก
                    </Button>
                    
                    <Button
                        onClick={handleGoBack}
                        variant="secondary"
                        className="tw-px-6 tw-py-3 tw-bg-white tw-text-gray-700 tw-font-medium tw-rounded-xl tw-border tw-border-gray-300 tw-shadow-sm hover:tw-shadow-md tw-transition-all tw-duration-200 tw-flex tw-items-center tw-justify-center tw-gap-2"
                    >
                        <ArrowLeft className="tw-w-5 tw-h-5" />
                        ย้อนกลับ
                    </Button> */}
                    <Button
                        onClick={handleGoHome}
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
                        ต้องการความช่วยเหลือ?
                    </h3>
                    <p className="tw-text-sm tw-text-gray-600 tw-mb-4">
                        หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
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