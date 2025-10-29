export interface DashboardBooking {
  id: string;
  court_number: number;
  court_name: string;
  date: string; // YYYY-MM-DD format
  time_slot: string; // HH:MM format
  user_name: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'available';
  created_at: string;
}

export interface DashboardBookingResponse {
  success: boolean;
  data: DashboardBooking[];
  message?: string;
}

export type DashboardBookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'available';