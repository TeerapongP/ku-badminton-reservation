"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/components/Loading";
import { useAdminRole } from "@/hooks/useAdminRole";

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly requiredRole?: readonly string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { status } = useSession();
  const { decodedRole, loading: roleLoading } = useAdminRole();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || roleLoading) return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (requiredRole && decodedRole && !requiredRole.includes(decodedRole)) {
      router.push("/");
      return;
    }
  }, [status, roleLoading, decodedRole, router, requiredRole]);

  if (status === "loading" || roleLoading) {
    return (
      <Loading
        text="กำลังตรวจสอบสิทธิ์..."
        color="emerald"
        size="md"
        fullScreen={true}
      />
    );
  }

  if (status === "unauthenticated") {
    return (
      <Loading
        text="กำลังเปลี่ยนเส้นทาง..."
        color="emerald"
        size="md"
        fullScreen={true}
      />
    );
  }

  if (requiredRole && decodedRole && !requiredRole.includes(decodedRole)) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-50">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-mb-4">Access denied / ไม่ได้รับอนุญาต</h1>
          <p className="tw-text-gray-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}