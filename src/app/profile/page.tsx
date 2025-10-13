import ProfileContainer from "@/container/profile/ProfileContainer";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContainer />
        </ProtectedRoute>
    );
}