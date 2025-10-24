export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  body?: (rowData: any) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface DataTableComponentProps {
  data?: any[];
  columns?: DataTableColumn[];
  onEdit?: (rowData: any) => void;
  onDelete?: (rowData: any) => void;
  onAdd?: () => void;
  title?: string;
  searchPlaceholder?: string;
  addButtonLabel?: string;
  showAddButton?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  emptyMessage?: string;
  stripedRows?: boolean;
  showGridlines?: boolean;
}

export interface BookingData {
  id: number;
  reservationId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole?: 'student' | 'staff' | 'guest' | 'admin';
  facilityName: string;
  courtName: string;
  courtCode?: string;
  playDate: string;
  timeSlots: string | string[];
  totalAmount: number;
  currency?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  createdAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface StatusConfig {
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  border: string;
  label: string;
}

export interface PaymentStatusConfig {
  color: string;
  bg: string;
  label: string;
}