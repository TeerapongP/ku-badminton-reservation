"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import {
    Users,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    ArrowLeft
} from "lucide-react";

interface Member {
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    registered_at: string;
    student_id?: string;
    staff_id?: string;
}

export default function AdminMembersPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");

    useEffect(() => {
        if (status === "loading") return;

        if (!session || (session.user as any)?.role !== "admin") {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchMembers();
    }, [session, status, router, toast]);

    const fetchMembers = async () => {
        try {
            // Mock data for now - will be replaced with actual API calls
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockMembers: Member[] = [
                {
                    user_id: "1",
                    username: "student001",
                    first_name: "สมชาย",
                    last_name: "ใจดี",
                    email: "somchai@ku.th",
                    phone: "0812345678",
                    role: "student",
                    status: "pending",
                    registered_at: "2024-01-15T10:30:00Z",
                    student_id: "65123456"
                },
                {
                    user_id: "2",
                    username: "staff001",
                    first_name: "สมหญิง",
                    last_name: "รักงาน",
                    email: "somying@ku.ac.th",
                    phone: "0823456789",
                    role: "staff",
                    status: "active",
                    registered_at: "2024-01-14T14:20:00Z",
                    staff_id: "STAFF001"
                },
                {
                    user_id: "3",
                    username: "student002",
                    first_name: "วิชัย",
                    last_name: "เรียนดี",
                    email: "wichai@ku.th",
                    phone: "0834567890",
                    role: "student",
                    status: "pending",
                    registered_at: "2024-01-16T09:15:00Z",
                    student_id: "65234567"
                }
            ];

            setMembers(mockMembers);
        } catch (error) {
            toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setMembers(prev => prev.map(member =>
                member.user_id === userId
                    ? { ...member, status: "active" }
                    : member
            ));

            toast.showSuccess("อนุมัติสมาชิกสำเร็จ", "สมาชิกสามารถเข้าใช้งานระบบได้แล้ว");
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติสมาชิกได้");
        }
    };

    const handleReject = async (userId: string) => {
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setMembers(prev => prev.map(member =>
                member.user_id === userId
                    ? { ...member, status: "rejected" }
                    : member
            ));

            toast.showSuccess("ปฏิเสธสมาชิกสำเร็จ", "ได้ส่งแจ้งเตือนไปยังผู้สมัครแล้ว");
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธสมาชิกได้");
        }
    };

    const filteredMembers = members.filter(member => {
        const matchesSearch =
            member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (member.student_id && member.student_id.includes(searchTerm)) ||
            (member.staff_id && member.staff_id.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || member.status === statusFilter;
        const matchesRole = roleFilter === "all" || member.role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <span className="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-bg-yellow-100 tw-text-yellow-800">
                        <Clock className="tw-w-3 tw-h-3 tw-mr-1" />
                        รอการอนุมัติ
                    </span>
                );
            case "active":
                return (
                    <span className="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-bg-green-100 tw-text-green-800">
                        <CheckCircle className="tw-w-3 tw-h-3 tw-mr-1" />
                        ใช้งานได้
                    </span>
                );
            case "rejected":
                return (
                    <span className="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-bg-red-100 tw-text-red-800">
                        <XCircle className="tw-w-3 tw-h-3 tw-mr-1" />
                        ถูกปฏิเสธ
                    </span>
                );
            default:
                return null;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "student":
                return <span className="tw-text-blue-600 tw-font-medium">นิสิต</span>;
            case "staff":
                return <span className="tw-text-purple-600 tw-font-medium">บุคลากร</span>;
            case "guest":
                return <span className="tw-text-gray-600 tw-font-medium">บุคคลทั่วไป</span>;
            default:
                return <span className="tw-text-gray-600 tw-font-medium">{role}</span>;
        }
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูลสมาชิก..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || (session.user as any)?.role !== "admin") {
        return null;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            {/* Header */}
            <div className="tw-mb-8">
                <div className="tw-flex tw-items-center tw-mb-4">
                    <Button
                        onClick={() => router.push("/admin")}
                        variant="secondary"
                        className="tw-mr-4 tw-px-3 tw-py-2"
                    >
                        <ArrowLeft className="tw-w-4 tw-h-4 tw-mr-2" />
                        กลับ
                    </Button>
                    <div>
                        <h1 className="tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-via-indigo-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent">
                            จัดการสมาชิก
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-2">
                            อนุมัติ ปฏิเสธ และจัดการสมาชิกในระบบ
                        </p>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-blue-500 tw-via-indigo-500 tw-to-purple-500 tw-rounded-full" />
            </div>

            {/* Filters */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-mb-8 tw-border tw-border-gray-100">
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">
                    <div className="tw-relative">
                        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-gray-400 tw-w-5 tw-h-5" />
                        <input
                            type="text"
                            placeholder="ค้นหาสมาชิก..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="tw-w-full tw-pl-10 tw-pr-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                        />
                    </div>

                    <div className="tw-relative">
                        <Filter className="tw-absolute tw-left-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-gray-400 tw-w-5 tw-h-5" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="tw-w-full tw-pl-10 tw-pr-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all tw-appearance-none tw-bg-white"
                        >
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="pending">รอการอนุมัติ</option>
                            <option value="active">ใช้งานได้</option>
                            <option value="rejected">ถูกปฏิเสธ</option>
                        </select>
                    </div>

                    <div className="tw-relative">
                        <Users className="tw-absolute tw-left-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-gray-400 tw-w-5 tw-h-5" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="tw-w-full tw-pl-10 tw-pr-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all tw-appearance-none tw-bg-white"
                        >
                            <option value="all">ประเภทสมาชิกทั้งหมด</option>
                            <option value="student">นิสิต</option>
                            <option value="staff">บุคลากร</option>
                            <option value="guest">บุคคลทั่วไป</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Members List */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
                    <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">
                        รายการสมาชิก ({filteredMembers.length} คน)
                    </h2>
                </div>

                {filteredMembers.length === 0 ? (
                    <div className="tw-text-center tw-py-12">
                        <Users className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่พบข้อมูลสมาชิก</p>
                    </div>
                ) : (
                    <div className="tw-overflow-x-auto">
                        <table className="tw-w-full">
                            <thead className="tw-bg-gray-50">
                                <tr>
                                    <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        สมาชิก
                                    </th>
                                    <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        ประเภท
                                    </th>
                                    <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        สถานะ
                                    </th>
                                    <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        วันที่สมัคร
                                    </th>
                                    <th className="tw-px-6 tw-py-4 tw-text-right tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        การจัดการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="tw-bg-white tw-divide-y tw-divide-gray-200">
                                {filteredMembers.map((member) => (
                                    <tr key={member.user_id} className="hover:tw-bg-gray-50 tw-transition-colors">
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            <div>
                                                <div className="tw-text-sm tw-font-medium tw-text-gray-900">
                                                    {member.first_name} {member.last_name}
                                                </div>
                                                <div className="tw-text-sm tw-text-gray-500">
                                                    {member.email}
                                                </div>
                                                <div className="tw-text-xs tw-text-gray-400">
                                                    {member.student_id && `รหัสนิสิต: ${member.student_id}`}
                                                    {member.staff_id && `รหัสบุคลากร: ${member.staff_id}`}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getRoleBadge(member.role)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getStatusBadge(member.status)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-500">
                                            {new Date(member.registered_at).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-right tw-text-sm tw-font-medium">
                                            <div className="tw-flex tw-items-center tw-justify-end tw-space-x-2">
                                                <Button
                                                    onClick={() => {/* View details */ }}
                                                    variant="secondary"
                                                    className="tw-px-3 tw-py-1 tw-text-xs"
                                                >
                                                    <Eye className="tw-w-3 tw-h-3 tw-mr-1" />
                                                    ดู
                                                </Button>
                                                {member.status === "pending" && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleApprove(member.user_id)}
                                                            className="tw-px-3 tw-py-1 tw-text-xs"
                                                            colorClass="tw-bg-green-600 hover:tw-bg-green-700 tw-text-white"
                                                        >
                                                            <CheckCircle className="tw-w-3 tw-h-3 tw-mr-1" />
                                                            อนุมัติ
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleReject(member.user_id)}
                                                            variant="danger"
                                                            className="tw-px-3 tw-py-1 tw-text-xs"
                                                        >
                                                            <XCircle className="tw-w-3 tw-h-3 tw-mr-1" />
                                                            ปฏิเสธ
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}