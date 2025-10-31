"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Loading from "@/components/Loading";
import BannerManagementContainer from "@/container/admin/BannerManagementContainer";

export default function BannerManagementPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <Loading
                text="กำลังโหลด..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    if (!session?.user) {
        redirect("/auth/login");
    }

    // ตรวจสอบสิทธิ์ admin หรือ super_admin
    if (!['admin', 'super_admin'].includes(session.user.role ?? "")) {
        redirect("/");
    }

    return <BannerManagementContainer />;
}