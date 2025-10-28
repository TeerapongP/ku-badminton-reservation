"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModa";

type Slot = {
    id: number;
    label: string;
    status: "available" | "reserved" | "pending" | "break";
    bookedBy?: string;
};

// ชนิดฝั่งหน้าบ้านที่เราจะใช้แสดงผล
type CourtView = {
    courtId: number | string;
    name: string;
    building?: string | null;
    pricePerHour?: number | null; // หน่วย THB ถ้ามี
    active?: boolean;
};

export default function CourtBookingContainer() {
    const params = useParams<{ id?: string }>();
    const toast = useToast();

    // รองรับ /courts/[id]
    const courtId = useMemo(() => {
        const raw = params?.id ?? "";
        const id = Array.isArray(raw) ? raw[0] : raw;
        return id?.trim() || null;
    }, [params]);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [court, setCourt] = useState<CourtView | null>(null);
    const [visible, setVisible] = useState<boolean>(false);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const hundredYearsAgo = useMemo(() => {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() - 100);
        return d;
    }, [today]);

    const slots: Slot[] = [
        { id: 1, label: "08.00 - 09.00 น.", status: "reserved", bookedBy: "คุณสมชาย" },
        { id: 2, label: "09.00 - 10.00 น.", status: "reserved", bookedBy: "คุณสมศรี" },
        { id: 3, label: "10.00 - 11.00 น.", status: "reserved", bookedBy: "คุณสมหมาย" },
        { id: 4, label: "11.00 - 12.00 น.", status: "pending", bookedBy: "รอชำระเงิน" },
        { id: 5, label: "พักกลางวัน", status: "break" },
        { id: 6, label: "13.00 - 14.00 น.", status: "available" },
        { id: 7, label: "14.00 - 15.00 น.", status: "available" },
    ];

    // map response จาก API → รูปแบบที่จอใช้
    function mapServerToView(s: any): CourtView {
        // รองรับทั้ง snake_case และ camelCase
        const courtId = s.courtId ?? s.court_id ?? s.id ?? "-";
        const name =
            s.name ??
            s.courtName ??
            (s.courtCode ? `Court ${s.courtCode}` : "Court");
        const building = s.building ?? s.facilityNameTh ?? null;
        const pricePerHour =
            typeof s.pricePerHour === "number" ? s.pricePerHour : null;

        return { courtId, name, building, pricePerHour, active: s.active };
    }

    async function fetchCourtDetails(): Promise<CourtView | null> {
        try {
            const res = await fetch(`/api/court-details?courtId=${courtId}`, {
                cache: "no-store",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json?.data) return null;
            return mapServerToView(json.data);
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

    // เปลี่ยนวันแล้วให้ยกเลิกการเลือกช่วงเวลา
    useEffect(() => {
        setSelectedSlot(null);
    }, [selectedDate]);

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

    const handleSelectSlot = (slot: Slot) => {
        if (slot.status !== "available") return;
        setSelectedSlot(slot.id);
    };

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
                    </label>
                    <DateField
                        value={selectedDate}
                        onChange={setSelectedDate}
                        showIcon
                        minDate={today}
                        placeholder="เลือกวันที่ต้องการจอง"
                        required
                    />
                </div>
                <div className="tw-bg-gradient-to-r tw-from-teal-50 tw-to-emerald-50 tw-p-6 tw-rounded-2xl tw-border tw-border-teal-200">
                    <label className="tw-font-bold tw-text-emerald-800 tw-block tw-mb-5 tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-8 tw-h-8 tw-bg-emerald-600 tw-text-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-sm tw-font-bold">
                            2
                        </span>
                        กรุณาเลือกเวลาที่ต้องการ
                    </label>

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
                </div>

                {/* Legend */}
                <div className="tw-flex tw-flex-wrap tw-gap-6 tw-mt-8 tw-border-t-2 tw-border-gray-200 tw-pt-6 tw-text-sm">
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-red-300 tw-to-red-400 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">จองแล้ว</span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-w-5 tw-h-5 tw-rounded-md tw-bg-gradient-to-br tw-from-yellow-300 tw-to-yellow-400 tw-shadow-sm" />
                        <span className="tw-font-semibold tw-text-gray-700">รอชำระเงิน</span>
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
                        disabled={!selectedDate || !selectedSlot || !court || loading}
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
                    name: "นายจอง สนาม",
                    phone: "012-2587896",
                    email: "booking@example.com",
                    date: selectedDate?.toLocaleDateString("th-TH") ?? "-",
                    time: slots.find(s => s.id === selectedSlot)?.label ?? "-",
                    price: court?.pricePerHour?.toString() ?? "100",
                }}
                onCancel={() => alert("ยกเลิกการจองเรียบร้อย")}
                onEdit={() => alert("กลับไปแก้ไขข้อมูล")}
                onConfirm={() => alert("ดำเนินการชำระเงิน")}
            />
        </div>
    );
}
