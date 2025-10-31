"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModa";
import Loading from "@/components/Loading";
import { CourtView } from "@/types/CourtView";
import { Slot } from "@/types/Slot";



export default function CourtBookingContainer() {
    const params = useParams<{ id?: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    // ดึง time_slot parameter จาก URL
    const timeSlotParam = searchParams.get('time_slot');

    // รองรับ /courts/[id]
    const courtId = useMemo(() => {
        const raw = params?.id ?? "";
        const id = Array.isArray(raw) ? raw[0] : raw;
        return id?.trim() || null;
    }, [params]);

    const [selectedDate, setSelectedDate] = useState<Date | null>(
        // ถ้ามี time_slot parameter ให้ตั้งวันที่เป็นวันนี้โดยอัตโนมัติ
        timeSlotParam ? new Date() : null
    );
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [court, setCourt] = useState<CourtView | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [visible, setVisible] = useState<boolean>(false);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // map response จาก API → รูปแบบที่จอใช้
    function mapServerToView(s: any): CourtView {
        // รองรับทั้ง snake_case และ camelCase
        const courtId = s.courtId ?? s.court_id ?? s.id ?? "-";
        const name =
            s.courtName ??
            s.name ??
            (s.courtCode ? `Court ${s.courtCode}` : "Court");
        const building = s.building ?? s.facilityNameTh ?? null;
        const pricePerHour =
            typeof s.pricePerHour === "number" ? s.pricePerHour : null;

        return { courtId, name, building, pricePerHour, active: s.active };
    }

    // Fetch court availability for selected date
    const fetchCourtAvailability = async (date: Date) => {
        if (!courtId) return;

        setSlotsLoading(true);
        try {
            const dateString = date.toISOString().split('T')[0];
            const res = await fetch(`/api/courts/${courtId}/availability?date=${dateString}`, {
                cache: "no-store",
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            if (json.success && json.data) {
                setSlots(json.data);
            } else {
                throw new Error(json.message || 'Failed to fetch availability');
            }
        } catch (error) {
            console.error('Error fetching court availability:', error);
            toast?.showError("ไม่สามารถโหลดข้อมูลช่วงเวลาได้", "กรุณาลองใหม่อีกครั้ง");
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    async function fetchCourtDetails(): Promise<CourtView | null> {
        try {
            const res = await fetch(`/api/court-details?courtId=${courtId}`, {
                cache: "no-store",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json?.data) return null;
            const mappedData = mapServerToView(json.data);
            return mappedData;
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!courtId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchCourtDetails()
            .then((c) => setCourt(c))
            .catch(() => {
                toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
                setCourt(null);
            });
    }, [courtId]); // eslint-disable-line react-hooks/exhaustive-deps

    // เปลี่ยนวันแล้วให้ยกเลิกการเลือกช่วงเวลาและโหลดข้อมูลใหม่
    useEffect(() => {
        setSelectedSlot(null);
        if (selectedDate && courtId) {
            fetchCourtAvailability(selectedDate);
        } else {
            setSlots([]);
        }
    }, [selectedDate, courtId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select time slot จาก URL parameter
    useEffect(() => {
        if (!timeSlotParam || slots.length === 0) return;

        // หา slot ที่ตรงกับ time parameter
        const matchingSlot = slots.find(slot => {
            // ตรวจสอบทั้ง label และ time format
            const slotTime = slot.label; // เช่น "11:00-12:00" หรือ "11:00"

            // ตรวจสอบว่า slot time ขึ้นต้นด้วย time parameter หรือไม่
            return slotTime.startsWith(timeSlotParam) && slot.status === 'available';
        });

        if (matchingSlot) {
            setSelectedSlot(matchingSlot.id);
            // toast?.showSuccess("เลือกเวลาอัตโนมัติ", `เลือกช่วงเวลา ${matchingSlot.label} แล้ว`);
        } else {
            // หากไม่พบ slot ที่ตรงกัน หรือ slot ไม่ว่าง
            const foundSlot = slots.find(slot => slot.label.startsWith(timeSlotParam));
            if (foundSlot) {
                toast?.showWarn("ช่วงเวลาไม่ว่าง", `ช่วงเวลา ${foundSlot.label} ถูกจองแล้ว`);
            } else {
                toast?.showWarn("ไม่พบช่วงเวลา", `ไม่พบช่วงเวลา ${timeSlotParam} ในวันที่เลือก`);
            }
        }
    }, [slots, timeSlotParam, toast]);

    const getSlotStyle = (slot: Slot) => {
        const base =
            "tw-w-full tw-py-5 tw-rounded-2xl tw-text-center tw-font-bold tw-text-lg tw-transition-all tw-duration-300 tw-border-2 tw-shadow-lg tw-cursor-pointer hover:tw-scale-105";

        if (slot.status === "reserved")
            return `${base} tw-bg-gradient-to-br tw-from-red-100 tw-to-red-200 tw-border-red-400 tw-text-red-800 tw-cursor-not-allowed hover:tw-scale-100`;
        if (slot.status === "pending")
            return `${base} tw-bg-gradient-to-br tw-from-yellow-100 tw-to-yellow-200 tw-border-yellow-400 tw-text-yellow-800 tw-cursor-not-allowed hover:tw-scale-100`;
        if (slot.status === "break")
            return `${base} tw-bg-gradient-to-br tw-from-gray-100 tw-to-gray-200 tw-border-gray-300 tw-text-gray-500 tw-cursor-default hover:tw-scale-100`;
        if (slot.status === "available") {
            const isSelected = selectedSlot === slot.id;
            return `${base} ${isSelected
                ? "tw-bg-gradient-to-br tw-from-emerald-500 tw-to-teal-600 tw-text-white tw-border-emerald-600 tw-scale-105 tw-shadow-2xl tw-ring-4 tw-ring-emerald-300"
                : "tw-bg-gradient-to-br tw-from-green-100 tw-to-emerald-100 tw-border-green-400 tw-text-green-800 hover:tw-from-green-200 hover:tw-to-emerald-200"
                }`;
        }
        return base;
    };

    // Check authentication
    useEffect(() => {
        if (status === "loading") return; // Still loading session

        if (!session) {
            toast?.showError("กรุณาเข้าสู่ระบบ", "คุณต้องเข้าสู่ระบบก่อนจองสนาม");
            router.push("/login");
            return;
        }
    }, [session, status, router, toast]);

    const handleSelectSlot = (slot: Slot) => {
        if (slot.status !== "available") return;
        setSelectedSlot(slot.id);
    };

    // Show loading while checking authentication
    if (status === "loading") {
        return (
            <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-emerald-50 tw-via-green-50 tw-to-teal-50 tw-flex tw-items-center tw-justify-center">
                <Loading
                    text="กำลังตรวจสอบการเข้าสู่ระบบ..."
                    fullScreen={false}
                    color="emerald"
                    size="lg"
                />
            </div>
        );
    }

    // Don't render anything if not authenticated (will redirect)
    if (!session) {
        return null;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-emerald-50 tw-via-green-50 tw-to-teal-50 tw-py-10 tw-px-6">
            <div className="tw-max-w-5xl tw-mx-auto tw-bg-white/80 tw-backdrop-blur-sm tw-rounded-3xl tw-shadow-2xl tw-p-8 md:tw-p-12 tw-border tw-border-emerald-100">
                {/* Header */}
                <div className="tw-flex tw-items-center tw-gap-4">
                    <div className="tw-w-16 tw-h-16 tw-bg-gradient-to-br tw-from-emerald-400 tw-to-teal-600 tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                        <span className="tw-text-2xl tw-font-bold tw-text-white">
                            {court?.courtId ?? "-"}
                        </span>
                    </div>
                    <div>
                        <h4 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-text-transparent tw-bg-clip-text tw-bg-gradient-to-r tw-from-emerald-600 tw-to-teal-600">
                            {loading ? "กำลังโหลด..." : court ? court.name : "ไม่พบข้อมูลคอร์ท"}
                        </h4>
                        {!loading && court && (
                            <p className="tw-text-gray-600">
                                {court.building}
                                {typeof court.pricePerHour === "number" &&
                                    ` • ${new Intl.NumberFormat("th-TH", {
                                        style: "currency",
                                        currency: "THB",
                                    }).format(court.pricePerHour)}/ชม.`}
                            </p>
                        )}
                    </div>
                </div>
                <div className="tw-mt-6 tw-mb-10 tw-bg-gradient-to-r tw-from-emerald-50 tw-to-teal-50 tw-p-6 tw-rounded-2xl tw-border tw-border-emerald-200">
                    <label className="tw-font-bold tw-text-emerald-800 tw-block tw-mb-3 tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-8 tw-h-8 tw-bg-emerald-600 tw-text-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-sm tw-font-bold">
                            1
                        </span>
                        กรุณาเลือกวันที่ต้องการจอง
                        {timeSlotParam && (
                            <span className="tw-ml-2 tw-px-3 tw-py-1 tw-bg-blue-100 tw-text-blue-800 tw-rounded-full tw-text-sm tw-font-medium">
                                เวลา: {timeSlotParam}
                            </span>
                        )}
                    </label>
                    <DateField
                        value={selectedDate}
                        onChange={setSelectedDate}
                        showIcon
                        minDate={today}
                        placeholder="เลือกวันที่ต้องการจอง"
                        required
                    />
                    {timeSlotParam && (
                        <div className="tw-mt-3 tw-p-3 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-lg">
                            <div className="tw-flex tw-items-center tw-gap-2 tw-text-blue-800">
                                <svg className="tw-w-4 tw-h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="tw-text-sm tw-font-medium">
                                    ระบบจะเลือกช่วงเวลา {timeSlotParam} โดยอัตโนมัติ (หากว่าง)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="tw-bg-gradient-to-r tw-from-teal-50 tw-to-emerald-50 tw-p-6 tw-rounded-2xl tw-border tw-border-teal-200">
                    <label className="tw-font-bold tw-text-emerald-800 tw-block tw-mb-5 tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-8 tw-h-8 tw-bg-emerald-600 tw-text-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-sm tw-font-bold">
                            2
                        </span>
                        กรุณาเลือกเวลาที่ต้องการ
                    </label>

                    {!selectedDate ? (
                        <div className="tw-text-center tw-py-12 tw-text-gray-500">
                            <div className="tw-text-4xl tw-mb-4">📅</div>
                            <p className="tw-text-lg">กรุณาเลือกวันที่ก่อน</p>
                        </div>
                    ) : slotsLoading ? (
                        <div className="tw-text-center tw-py-12">
                            <div className="tw-animate-spin tw-rounded-full tw-h-12 tw-w-12 tw-border-b-2 tw-border-emerald-600 tw-mx-auto tw-mb-4"></div>
                            <p className="tw-text-gray-600">กำลังโหลดข้อมูลช่วงเวลา...</p>
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="tw-text-center tw-py-12 tw-text-gray-500">
                            <div className="tw-text-4xl tw-mb-4">❌</div>
                            <p className="tw-text-lg">ไม่มีช่วงเวลาให้จองในวันนี้</p>
                        </div>
                    ) : (
                        <motion.div
                            className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {slots.map((slot) => (
                                <motion.div
                                    key={slot.id}
                                    className={getSlotStyle(slot)}
                                    onClick={() => handleSelectSlot(slot)}
                                    whileHover={slot.status === "available" ? { scale: 1.05 } : {}}
                                    whileTap={slot.status === "available" ? { scale: 0.98 } : {}}
                                    role="button"
                                    aria-disabled={slot.status !== "available"}
                                >
                                    <span>{slot.label}</span>
                                    {slot.status === "reserved" && (
                                        <div className="tw-text-sm tw-font-normal tw-text-red-600 tw-mt-1">
                                            {slot.bookedBy}
                                        </div>
                                    )}
                                    {slot.status === "pending" && (
                                        <div className="tw-text-sm tw-font-normal tw-text-yellow-700 tw-mt-1">
                                            {slot.bookedBy}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Legend */}
                <div className="tw-flex tw-flex-wrap tw-gap-6 tw-mt-8 tw-border-t-2 tw-border-gray-200 tw-pt-6 tw-text-sm">
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-red-300 tw-to-red-400 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">จองแล้ว</span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-yellow-300 tw-to-yellow-400 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">รอตรวจสอบ</span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-green-300 tw-to-emerald-300 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">ว่างให้จอง</span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-gray-300 tw-to-gray-400 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">พักกลางวัน</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="tw-flex tw-justify-end tw-gap-4 tw-mt-10">
                    <Button
                        className="tw-w-1/2 tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none"
                        colorClass="tw-bg-gradient-to-r tw-from-red-500 tw-to-red-600 hover:tw-from-red-600 hover:tw-to-red-700 tw-text-white focus:tw-ring-4 focus:tw-ring-red-300"
                        onClick={() => {
                            setSelectedDate(null);
                            setSelectedSlot(null);
                        }}
                        disabled={loading}
                    >
                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                            ยกเลิก
                        </span>
                    </Button>

                    <Button
                        className="tw-w-1/2 tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-60 disabled:tw-cursor-not-allowed"
                        colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        onClick={() => setVisible(true)}
                        disabled={!selectedDate || !selectedSlot || !court || loading || slotsLoading}
                    >
                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                            จอง
                        </span>
                    </Button>
                </div>
            </div>
            <BookingConfirmationModal
                visible={visible}
                onHide={() => setVisible(false)}
                bookingData={{
                    date: selectedDate?.toISOString().split('T')[0] ?? "-", // ใช้ ISO format สำหรับ API
                    time: slots.find(s => s.id === selectedSlot)?.label ?? "-",
                    price: court?.pricePerHour?.toString() ?? "100",
                    courtName: court?.name ?? "-",
                    facilityName: court?.building ?? "-",
                    courtId: courtId,
                    slotId: selectedSlot || undefined,
                }}
                useSessionData={true}
                onCancel={() => {
                    setVisible(false);
                    toast?.showInfo("ยกเลิกการจอง", "การจองถูกยกเลิกแล้ว");
                }}
                onConfirm={(reservationData) => {
                    setVisible(false);
                    // รีเฟรชข้อมูลช่วงเวลา
                    if (selectedDate) {
                        fetchCourtAvailability(selectedDate);
                    }
                    toast?.showSuccess("จองสำเร็จ", "การจองของคุณอยู่ระหว่างการตรวจสอบ");
                }}
            />
        </div>
    );
}
