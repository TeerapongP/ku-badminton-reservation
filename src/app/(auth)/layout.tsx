import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | KU Badminton",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 lg:py-16 px-4">
            <div className="w-full h-auto max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex flex-col lg:flex-row h-full">
                    <div className="w-full lg:w-1/2 bg-[#C9E4CA] flex items-center justify-center p-8 lg:p-16">
                        <Image
                            src="/images/ku-logo.png"
                            alt="Kasetsart University"
                            width={300}
                            height={400}
                            className="object-contain w-48 h-64 sm:w-56 sm:h-72 lg:w-[300px] lg:h-[400px]"
                            priority
                        />
                    </div>

                    <div className="w-full lg:w-1/2">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}