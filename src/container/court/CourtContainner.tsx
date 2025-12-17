
"use client";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading, { ButtonLoading } from "@/components/Loading";
import { useEffect, useState, useMemo } from "react";

export interface Court {
    court_id: string;        // ถ้าใน DB เป็น bigint ให้ส่งมาเป็น string ตาม API
    court_code: string;
    name: string;
    is_active: boolean;
    is_booked?: boolean;     // เพิ่มสถานะการจอง
    image_path?: string | null;
}

export default function CourtContainer() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();

    // รองรับ useParams ที่อาจเป็น string|string[]
    const facilityId = useMemo(() => {
        const v = (params?.id ?? "") as string | string[];
        return Array.isArray(v) ? v[0] : v;
    }, [params]);

    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState<string | null>(null);

    async function fetchCourts(): Promise<Court[]> {
        try {
            const res = await fetch(`/api/courts?facilityId=${facilityId}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []) as Court[];
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!facilityId) return;
        setLoading(true);
        fetchCourts()
            .then(setCourts)
            .catch(() => {
                toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
                setCourts([]);
            });
        // ผูกกับ facilityId เผื่อเปลี่ยนหน้า /facilities/[id]
    }, [facilityId]);

    const handleBook = (court: Court) => {
        if (!court.is_active) return;
        setBookingLoading(court.court_id);
        // ไปหน้าจองตามที่ต้องการปรับ route ได้ เช่น /facilities/[id]/courts/[courtId]
        router.push(`/courts-booking/${court.court_id}`);
    };

    // ฟังก์ชันสำหรับกำหนดสถานะ badge
    const getCourtBadgeClass = (court: Court) => {
        if (court.is_booked) return "tw-bg-blue-500/90 tw-text-white";
        if (court.is_active) return "tw-bg-green-500/90 tw-text-white";
        return "tw-bg-gray-500/90 tw-text-white";
    };

    const getCourtBadgeText = (court: Court) => {
        if (court.is_booked) return "จองแล้ว";
        if (court.is_active) return "พร้อมให้จอง";
        return "ปิดปรับปรุง";
    };

    // ฟังก์ชันสำหรับกำหนดสีปุ่ม
    const getButtonColorClass = (court: Court) => {
        if (court.is_booked) return "tw-bg-blue-500 tw-text-white";
        return "tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300";
    };

    const getButtonText = (court: Court, isLoading: boolean) => {
        if (isLoading) return null; // จะแสดง loading component แทน
        if (court.is_booked) return "จองแล้ว";
        if (court.is_active) return "จองสนามเลย";
        return "ยังไม่เปิดใช้งาน";
    };

    // Render empty state
    const renderEmptyState = () => (
        <div className="tw-text-center tw-mt-20">
            <div className="tw-inline-block tw-p-8 tw-bg-white tw-rounded-2xl tw-shadow-lg">
                <div className="tw-w-20 tw-h-20 tw-bg-gray-100 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4">
                    <svg className="tw-w-10 tw-h-10 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>
                <p className="tw-text-gray-600 tw-font-medium tw-text-lg">ไม่มีข้อมูลสนาม</p>
                <p className="tw-text-gray-400 tw-text-sm tw-mt-1">กรุณาลองใหม่อีกครั้งภายหลัง</p>
            </div>
        </div>
    );

    // Render content based on state
    const renderContent = () => {
        if (loading) {
            return <Loading size="lg" text="กำลังโหลดข้อมูลสนาม..." color="emerald" fullScreen={false} />;
        }

        if (courts.length === 0) {
            return renderEmptyState();
        }

        return (
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-8 tw-max-w-7xl tw-mx-auto">
                    {courts.map((c) => (
                        <div key={c.court_id} className="tw-group">
                            <div className="tw-relative tw-bg-white tw-rounded-3xl tw-shadow-lg hover:tw-shadow-2xl tw-transition-all tw-duration-300 tw-overflow-hidden">
                                <div className="tw-absolute tw-top-4 tw-right-4 tw-z-20">
                                    <span className={`tw-inline-flex tw-items-center tw-px-3 tw-py-1.5 tw-rounded-full tw-text-xs tw-font-bold tw-shadow tw-backdrop-blur-sm ${getCourtBadgeClass(c)}`}>
                                        {getCourtBadgeText(c)}
                                    </span>
                                </div>

                                <div className="tw-relative tw-h-56 tw-overflow-hidden">
                                    <Image
                                        src={c.image_path ?? "/images/courts.jpg"}
                                        alt={c.name}
                                        fill
                                        sizes="(min-width: 1024px) 50vw, 100vw"
                                        className="tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105"
                                        priority={false}
                                    />
                                    <div className="tw-absolute tw-inset-0 tw-bg-gradient-to-t tw-from-black/30 tw-to-transparent" />
                                </div>

                                <div className="tw-p-8">
                                    <h3 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-1 group-hover:tw-text-green-600 tw-transition-colors">
                                        {c.name}
                                    </h3>
                                    <Button
                                        onClick={() => handleBook(c)}
                                        disabled={!c.is_active || c.is_booked || bookingLoading === c.court_id}
                                        className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-60 disabled:hover:tw-scale-100"
                                        colorClass={getButtonColorClass(c)}
                                        aria-disabled={!c.is_active || c.is_booked || bookingLoading === c.court_id}
                                    >
                                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                            {bookingLoading === c.court_id ? (
                                                <>
                                                    <ButtonLoading size="sm" />
                                                    กำลังเข้าสู่หน้าจอง...
                                                </>
                                            ) : (
                                                getButtonText(c, false)
                                            )}
                                        </span>
                                    </Button>
                                </div>

                                <div className="tw-pointer-events-none tw-absolute tw-bottom-0 tw-right-0 tw-w-28 tw-h-28 tw-bg-gradient-to-tl tw-from-green-50 tw-to-transparent tw-rounded-tl-full tw-opacity-60" />
                            </div>
                        </div>
                    ))}
                </div>
        );
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-green-50 tw-via-emerald-50 tw-to-teal-50 tw-px-6">
            <div className="tw-text-center">
                <h1 className="tw-text-4xl md:tw-text-6xl tw-font-bold tw-bg-gradient-to-r tw-from-green-600 tw-via-emerald-600 tw-to-teal-600 tw-bg-clip-text tw-text-transparent tw-mb-3">
                    สนามแบดมินตัน
                </h1>
                <p className="tw-text-base md:tw-text-lg tw-text-gray-700 tw-font-medium">มหาวิทยาลัยเกษตรศาสตร์</p>
                <p className="tw-text-gray-500 tw-text-sm tw-mt-1">เลือกสนามที่คุณต้องการจอง</p>
                <div className="tw-mt-5 tw-mb-5 tw-h-1.5 tw-w-28 tw-bg-gradient-to-r tw-from-green-500 tw-via-emerald-500 tw-to-teal-500 tw-mx-auto tw-rounded-full" />
            </div>

            {renderContent()}
        </div>
    );
}
