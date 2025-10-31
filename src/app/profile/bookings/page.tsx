"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import BookingHistoryContainer from "@/container/profile/BookingHistoryContainer";
import Loading from "@/components/Loading";

export default function BookingHistoryPage() {
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

    return <BookingHistoryContainer />;
}