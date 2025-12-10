import { Facility } from "@/lib/Facility";

interface Court {
    court_id: string;
    court_code: string;
    name: string | null;
    is_active: boolean;
    image_path: string | null;
}

interface BlackoutForm {
    court_id: string;
    start_datetime: string;
    end_datetime: string;
    reason: string;
}

export interface BlackoutFormModalProps {
    show: boolean;
    courts: Court[];
    selectedFacility: Facility | undefined;
    blackoutForm: BlackoutForm;
    setBlackoutForm: React.Dispatch<React.SetStateAction<BlackoutForm>>;
    handleCreateBlackout: (e: React.FormEvent) => void;
    submitting: boolean;
    onClose: () => void;
}