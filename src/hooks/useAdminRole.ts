import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function useAdminRole() {
    const { data: session, status } = useSession();
    const [decodedRole, setDecodedRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRole = async () => {
            if (status === "loading") {
                setLoading(true);
                return;
            }
            
            if (!session?.user) {
                setDecodedRole(null);
                setLoading(false);
                return;
            }

            const rawRole = (session.user as any)?.role;
            
            if (!rawRole) {
                setDecodedRole(null);
                setLoading(false);
                return;
            }

            const plainRoles = new Set(['admin', 'super_admin', 'student', 'staff', 'guest']);
            
            // ถ้า role เป็น plain text อยู่แล้ว ไม่ต้อง decode
            if (plainRoles.has(rawRole)) {
                console.log("Role is plain text:", rawRole);
                setDecodedRole(rawRole);
                setLoading(false);
                return;
            }

            // ถ้า role ถูก encrypt ให้เรียก API เพื่อ decode (ไม่ควร decode ใน client)
            try {
                const res = await fetch("/api/auth/role");
                
                if (!res.ok) {
                    throw new Error("Failed to fetch role");
                }
                
                const data = await res.json();
                setDecodedRole(data.role ?? null);
                setLoading(false);
            } catch (err) {
                console.error("[useAdminRole] Failed to fetch role from API:", err);
                // Fallback: ถือว่าไม่มี role
                setDecodedRole(null);
                setLoading(false);
            }
        };

        loadRole();
    }, [session, status]);

    const isAdmin = decodedRole ? ADMIN_ROLES.has(decodedRole) : false;
    const isSuperAdmin = decodedRole === "super_admin";

    return {
        decodedRole,
        loading,
        isAdmin,
        isSuperAdmin,
        session,
        status
    };
}
