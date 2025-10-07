"use client";

import { useParams } from "next/navigation";

export default function CourtContainer() {
    const { id } = useParams();

    return (
        <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-100">
            <div className="tw-text-center">
                <h1 className="tw-text-4xl tw-font-bold tw-text-emerald-600">
                    หน้ารายละเอียดสนาม
                </h1>
                <p className="tw-mt-4 tw-text-lg tw-text-gray-700">
                    คุณกำลังดูสนามหมายเลข: <span className="tw-font-semibold">{id}</span>
                </p>
            </div>
        </div>
    );
}
