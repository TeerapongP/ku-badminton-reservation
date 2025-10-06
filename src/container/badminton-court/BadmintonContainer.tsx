"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/component/ToastProvider";

// ถ้ามีในโปรเจกต์อยู่แล้ว ให้ลบท่อนนี้ออก
export interface Facility {
  facility_id: string;        // BIGINT -> ส่งเป็น string จาก API
  facility_code: string;
  name_th: string;
  name_en?: string | null;
  active: boolean;
  image_path?: string | null; // ตัวใหม่ที่เรา ALTER มา
}

export default function BadmintonContainer() {
  const router = useRouter();
  const toast = useToast();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFacility(): Promise<Facility[]> {
    try {
      const res = await fetch("/api/facilities", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.data ?? [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFacility()
      .then(setFacilities)
      .catch(() => {
        toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
        setFacilities([]);
      });
  }, []);

  const goToCourts = (f: Facility) => {
    toast.showSuccess("เลือกสนามแล้ว", f.name_th);
    router.push(`/courts?facilityId=${encodeURIComponent(f.facility_id)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-16 px-6">
      <div className="text-center mb-14">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
          สนามแบดมินตัน
        </h1>
        <p className="text-base md:text-lg text-gray-700 font-medium">
          มหาวิทยาลัยเกษตรศาสตร์
        </p>
        <p className="text-gray-500 text-sm mt-1">เลือกสนามที่คุณต้องการจอง</p>
        <div className="mt-5 h-1.5 w-28 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 mx-auto rounded-full" />
      </div>

      {loading ? (
        <div className="text-center mt-20">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center mt-20">
          <div className="inline-block p-8 bg-white rounded-2xl shadow-lg">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium text-lg">ไม่มีข้อมูลสนาม</p>
            <p className="text-gray-400 text-sm mt-1">กรุณาลองใหม่อีกครั้งภายหลัง</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {facilities.map((f) => (
            <div key={f.facility_id} className="group">
              <div className="relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-4 right-4 z-20">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow backdrop-blur-sm ${
                      f.active ? "bg-green-500/90 text-white" : "bg-gray-500/90 text-white"
                    }`}
                  >
                    {f.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </div>

                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={f.image_path || "/images/default-facility.jpg"}
                    alt={f.name_th}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-1 group-hover:text-green-600 transition-colors">
                    {f.name_th}
                  </h3>
                  {f.name_en && <p className="text-gray-600 font-medium mb-3">{f.name_en}</p>}
                  <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium border border-green-200 text-sm">
                    รหัส: {f.facility_code}
                  </span>

                  {/* ปุ่ม */}
                  <button
                    disabled={!f.active}
                    onClick={() => f.active && goToCourts(f)}
                    className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
                      f.active
                        ? "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg active:scale-95"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {f.active ? "จองสนามเลย" : "ยังไม่เปิดใช้งาน"}
                  </button>
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 w-28 h-28 bg-gradient-to-tl from-green-50 to-transparent rounded-tl-full opacity-60" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
 
  );
}
