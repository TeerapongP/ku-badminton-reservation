import type { Metadata } from "next";
import Image from "next/image";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | KU Badminton",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-py-8 sm:tw-py-12 lg:tw-py-16 tw-px-4">
                <div className="tw-w-full tw-h-auto tw-max-w-6xl tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-overflow-hidden">
                    <div className="tw-flex tw-flex-col lg:tw-flex-row tw-h-full">

                        <div className="tw-w-full lg:tw-w-1/2 tw-bg-[#C9E4CA] tw-flex tw-items-center tw-justify-center tw-p-8 lg:tw-p-16">
                            <Image
                                src="/images/ku-logo.png"
                                alt="Kasetsart University"
                                width={300}
                                height={400}
                                className="tw-object-contain tw-w-48 tw-h-64 sm:tw-w-56 sm:tw-h-72 lg:tw-w-[300px] lg:tw-h-[400px]"
                                priority
                            />
                        </div>

                        <div className="tw-basis-1/2 tw-flex-shrink-0 tw-flex-grow-0">
                            {children}
                        </div>
                    </div>
                </div>
            </div>

        </ToastProvider>
    );
}