"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import Loading from "@/components/Loading";
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Shield,
    ShieldCheck,
    Eye,
    EyeOff,
    UserCheck,
    UserX,
    AlertTriangle
} from "lucide-react";
import { AdminUser, AdminFormData } from "@/lib/AdminUser";
import { DropdownField } from "@/components/DropdownField";


export default function AdminManage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const role = [
        { label: 'admin', value: 'admin' },
    ];
    const [formData, setFormData] = useState<AdminFormData>({
        username: "",
        password: "",
        email: "",
        first_name: "",
        last_name: "",
        role: "admin"
    });

    useEffect(() => {
        if (status === "loading") return;

        if (!session || (session.user.role !== "super_admin" && session.user.role !== "super_admin")) {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchAdmins();
    }, [session, status, router, toast]);

    const fetchAdmins = async () => {
        try {
            const response = await fetch('/api/admin/manage');
            const data = await response.json();

            if (data.success) {
                setAdmins(data.admins);
            } else {
                toast.showError("ไม่สามารถโหลดข้อมูลได้", data.error);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };



    const resetForm = () => {
        setFormData({
            username: "",
            password: "",
            email: "",
            first_name: "",
            last_name: "",
            role: "admin"
        });
        setShowCreateForm(false);
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.password || !formData.email ||
            !formData.first_name || !formData.last_name) {
            toast.showError("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        if (formData.password.length < 6) {
            toast.showError("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/admin/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                toast.showSuccess("สร้าง Admin สำเร็จ", data.message);
                resetForm();
                fetchAdmins();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (adminId: string, newStatus: string) => {
        try {
            const response = await fetch('/api/admin/manage', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: adminId,
                    status: newStatus
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.showSuccess("อัปเดตสถานะสำเร็จ", data.message);
                fetchAdmins();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        }
    };

    const handleDeleteAdmin = async (adminId: string, adminName: string) => {
        if (!confirm(`คุณต้องการลบ Admin "${adminName}" หรือไม่?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/manage?id=${adminId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                toast.showSuccess("ลบ Admin สำเร็จ", data.message);
                fetchAdmins();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        }
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูล..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || (session.user.role !== "super_admin" && session.user.role !== "super_admin")) {
        return null;
    }

    const getRoleIcon = (role: string) => {
        return role === 'super_admin' ? ShieldCheck : Shield;
    };

    const getRoleColor = (role: string) => {
        return role === 'super_admin' ? 'tw-text-red-600' : 'tw-text-blue-600';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'tw-text-green-600 tw-bg-green-100';
            case 'inactive': return 'tw-text-gray-600 tw-bg-gray-100';
            case 'suspended': return 'tw-text-red-600 tw-bg-red-100';
            default: return 'tw-text-gray-600 tw-bg-gray-100';
        }
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            {/* Header */}
            <div className="tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                    <div>
                        <h1 className="tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-red-600 tw-via-purple-600 tw-to-blue-600 tw-bg-clip-text tw-text-transparent">
                            จัดการ Admin
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-2">
                            จัดการบัญชี Admin และ Super Admin ในระบบ
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateForm(true)}
                        className="
    tw-h-12 tw-px-6 tw-text-lg tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-lg hover:tw-shadow-xl 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center
    tw-gap-2
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                        colorClass="
    tw-bg-gradient-to-r 
    tw-from-green-500 tw-to-emerald-600
    hover:tw-from-green-600 hover:tw-to-emerald-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-emerald-300/50
  "
                    >
                        <Plus className="tw-w-5 tw-h-5 tw-mr-2 tw-transition-transform tw-duration-300 group-hover:tw-rotate-180" />
                        เพิ่ม Admin
                    </Button>

                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-red-500 tw-via-purple-500 tw-to-blue-500 tw-rounded-full" />
            </div>

            {/* Create Form Modal */}
            {showCreateForm && (
                <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-8 tw-w-full tw-max-w-md tw-max-h-[90vh] tw-overflow-y-auto">
                        <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-6">เพิ่ม Admin ใหม่</h2>

                        <form onSubmit={handleCreateAdmin} className="tw-space-y-4">
                            <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                <InputField
                                    label="ชื่อ"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={(value) => setFormData(prev => ({ ...prev, first_name: String(value) }))}
                                    required
                                    placeholder="ชื่อจริง"
                                />
                                <InputField
                                    label="นามสกุล"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={(value) => setFormData(prev => ({ ...prev, last_name: String(value) }))}
                                    required
                                    placeholder="นามสกุล"
                                />
                            </div>

                            <InputField
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={(value) => setFormData(prev => ({ ...prev, username: String(value) }))}
                                required
                                placeholder="username สำหรับเข้าสู่ระบบ"
                            />

                            <InputField
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={(value) => setFormData(prev => ({ ...prev, email: String(value) }))}
                                required
                                placeholder="อีเมล"
                            />

                            <div className="tw-relative">
                                <InputField
                                    type="password"
                                    placeholder="กรอกรหัสผ่าน"
                                    value={formData.password}
                                    onChange={(value) => setFormData(prev => ({ ...prev, password: String(value) }))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    Role
                                </label>

                                <DropdownField
                                    name="role"
                                    label="การกระทำ"
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    options={role}
                                    placeholder="เลือกการกระทำ"
                                    className="tw-w-full"
                                />
                            </div>

                            <div className="tw-flex tw-gap-4 tw-pt-4">
                                <Button
                                    type="button"
                                    onClick={resetForm}
                                    className="
    tw-flex-1 tw-h-12 tw-text-lg tw-font-semibold
    tw-rounded-xl 
    tw-shadow-sm hover:tw-shadow-md
    hover:tw-scale-[1.02] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    tw-border tw-border-gray-300/70
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                    colorClass="
    tw-bg-gradient-to-r 
    tw-from-gray-100 tw-to-gray-200
    hover:tw-from-gray-200 hover:tw-to-gray-300
    tw-text-gray-700
    focus:tw-ring-4 focus:tw-ring-gray-200/50
  "
                                >
                                    ยกเลิก
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="
    tw-flex-1 tw-h-12 tw-text-lg tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-md hover:tw-shadow-lg 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
    disabled:tw-opacity-60 disabled:hover:tw-scale-100 disabled:tw-cursor-not-allowed
  "
                                    colorClass="
    tw-bg-gradient-to-r 
    tw-from-green-500 tw-to-emerald-600
    hover:tw-from-green-600 hover:tw-to-emerald-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-emerald-300/50
  "
                                >
                                    {loading ? "กำลังสร้าง..." : "สร้าง"}
                                </Button>

                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin List */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-p-6 tw-border-b tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-gap-3">
                        <Users className="tw-w-6 tw-h-6 tw-text-blue-600" />
                        <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">
                            รายการ Admin ({admins.length})
                        </h2>
                    </div>
                </div>

                <div className="tw-overflow-x-auto">
                    <table className="tw-w-full">
                        <thead className="tw-bg-gray-50">
                            <tr>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    ผู้ใช้
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    Role
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    สถานะ
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    เข้าสู่ระบบล่าสุด
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-right tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    การจัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="tw-divide-y tw-divide-gray-200">
                            {admins.map((admin) => {
                                const RoleIcon = getRoleIcon(admin.role);
                                const isCurrentUser = session.user.id === admin.id;

                                return (
                                    <tr key={admin.id} className="hover:tw-bg-gray-50">
                                        <td className="tw-px-6 tw-py-4">
                                            <div>
                                                <div className="tw-font-medium tw-text-gray-900">
                                                    {admin.name}
                                                    {isCurrentUser && (
                                                        <span className="tw-ml-2 tw-text-xs tw-bg-blue-100 tw-text-blue-800 tw-px-2 tw-py-1 tw-rounded-full">
                                                            คุณ
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="tw-text-sm tw-text-gray-500">
                                                    @{admin.username} • {admin.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4">
                                            <div className="tw-flex tw-items-center tw-gap-2">
                                                <RoleIcon className={`tw-w-5 tw-h-5 ${getRoleColor(admin.role)}`} />
                                                <span className={`tw-font-medium ${getRoleColor(admin.role)}`}>
                                                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4">
                                            <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${getStatusColor(admin.status)}`}>
                                                {admin.status === 'active' ? 'ใช้งานได้' :
                                                    admin.status === 'inactive' ? 'ไม่ใช้งาน' : 'ถูกระงับ'}
                                            </span>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-text-sm tw-text-gray-500">
                                            {admin.lastLoginAt ?
                                                new Date(admin.lastLoginAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'ยังไม่เคยเข้าสู่ระบบ'
                                            }
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-text-right">
                                            {!isCurrentUser && (
                                                <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
                                                    {admin.status === 'active' ? (
                                                        <Button
                                                            onClick={() => handleUpdateStatus(admin.id, 'suspended')}
                                                            className="
    tw-h-12 tw-px-6 tw-text-lg tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-lg hover:tw-shadow-xl 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                                            colorClass="
    tw-bg-gradient-to-r 
    tw-from-amber-400 tw-to-orange-500
    hover:tw-from-amber-500 hover:tw-to-orange-600
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-amber-300/50
  "
                                                        >
                                                            <UserX className="tw-w-4 tw-h-4" />
                                                            ระงับบัญชี
                                                        </Button>

                                                    ) : (
                                                        <Button
                                                            onClick={() => handleUpdateStatus(admin.id, 'active')}
                                                            className="
    tw-h-12 tw-px-6 tw-text-lg tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-lg hover:tw-shadow-xl 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                                            colorClass="
    tw-bg-gradient-to-r 
    tw-from-emerald-500 tw-to-green-600
    hover:tw-from-emerald-600 hover:tw-to-green-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-emerald-300/50
  "
                                                        >
                                                            <UserCheck className="tw-w-4 tw-h-4" />
                                                            เปิดใช้งานบัญชี
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                                                        className="
    tw-h-12 tw-px-6 tw-text-lg tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-lg hover:tw-shadow-xl 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-flex tw-items-center tw-justify-center tw-gap-2
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                                        colorClass="
    tw-bg-gradient-to-r 
    tw-from-rose-500 tw-to-red-600
    hover:tw-from-rose-600 hover:tw-to-red-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-rose-300/50
  "
                                                    >
                                                        <Trash2 className="tw-w-5 tw-h-5 tw-mr-1" />
                                                        ลบบัญชี
                                                    </Button>

                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {admins.length === 0 && (
                    <div className="tw-p-12 tw-text-center">
                        <AlertTriangle className="tw-w-12 tw-h-12 tw-text-gray-400 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่พบข้อมูล Admin</p>
                    </div>
                )}
            </div>
        </div>
    );
}