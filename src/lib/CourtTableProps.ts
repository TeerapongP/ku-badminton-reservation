import { Court } from "./Court";
import { Facility } from "./Facility";

export interface CourtTableProps {
    courts: Court[];
    selectedCourts: string[];
    selectedFacilityData: Facility | undefined;
    courtsLoading: boolean;
    onCourtSelection: (courtId: string) => void;
    onSelectAllCourts: () => void;
    onShowBlackoutForm: () => void;
    onShowMultiBookingForm: () => void;
}