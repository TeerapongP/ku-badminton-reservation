# Design Document - Dashboard Auto-refresh Booking Table

## Overview

ออกแบบระบบ Dashboard ที่แสดงตารางข้อมูลการจองแบดมินตันพร้อมฟีเจอร์การอัปเดตอัตโนมัติทุก 30 วินาที รวมถึง countdown timer และการแสดงเวลาอัปเดตล่าสุด

## Architecture

### Component Structure
```
src/app/page.tsx (Main Dashboard)
├── Banner (existing)
├── BookingDashboard (new)
    ├── RefreshStatus (new)
    │   ├── CountdownTimer
    │   └── LastUpdateTime
    └── BookingTable (new)
        ├── BookingTableHeader
        └── BookingTableRow[]
```

### Data Flow
1. **Initial Load**: Component mounts → Fetch booking data → Display table
2. **Auto Refresh**: Every 30s → Fetch data → Update table → Update timestamp
3. **Countdown**: Every 1s → Decrease counter → Update display
4. **Error Handling**: Failed request → Log error → Continue countdown → Retry next cycle

## Components and Interfaces

### 1. BookingDashboard Component
**Location**: `src/components/BookingDashboard.tsx`

**Props**: None (self-contained)

**State**:
```typescript
interface BookingDashboardState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  countdown: number;
}
```

**Hooks Used**:
- `useState` for component state
- `useEffect` for auto-refresh setup
- `useRef` for interval cleanup

### 2. RefreshStatus Component
**Location**: `src/components/RefreshStatus.tsx`

**Props**:
```typescript
interface RefreshStatusProps {
  countdown: number;
  lastUpdate: Date | null;
  error: string | null;
}
```

### 3. BookingTable Component
**Location**: `src/components/BookingTable.tsx`

**Props**:
```typescript
interface BookingTableProps {
  bookings: Booking[];
  loading: boolean;
}
```

## Data Models

### Booking Interface
```typescript
interface Booking {
  id: string;
  court_number: number;
  date: string; // YYYY-MM-DD format
  time_slot: string; // HH:MM-HH:MM format
  user_name: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}
```

### API Response
```typescript
interface BookingResponse {
  success: boolean;
  data: Booking[];
  message?: string;
}
```

## API Integration

### Endpoint
- **URL**: `/api/bookings/dashboard`
- **Method**: GET
- **Response**: BookingResponse

### Request Flow
1. Component calls `fetchBookings()`
2. API fetches from database with filters:
   - Current date and future dates
   - All active statuses
   - Ordered by date ASC, time_slot ASC
3. Return formatted booking data

## Auto-refresh Implementation

### Timer Management
```typescript
// Main refresh interval (30 seconds)
const refreshInterval = useRef<NodeJS.Timeout>();

// Countdown interval (1 second)  
const countdownInterval = useRef<NodeJS.Timeout>();

useEffect(() => {
  // Initial load
  fetchBookings();
  
  // Setup auto-refresh
  refreshInterval.current = setInterval(() => {
    fetchBookings();
    setCountdown(30);
  }, 30000);
  
  // Setup countdown
  countdownInterval.current = setInterval(() => {
    setCountdown(prev => prev > 0 ? prev - 1 : 30);
  }, 1000);
  
  // Cleanup
  return () => {
    if (refreshInterval.current) clearInterval(refreshInterval.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };
}, []);
```

### State Management
- **bookings**: Array of booking data
- **loading**: Boolean for loading state
- **error**: String for error messages
- **lastUpdate**: Date object for last successful update
- **countdown**: Number (30 to 0) for countdown display

## UI Design

### Layout Structure
```
┌─────────────────────────────────────┐
│             Banner                   │
├─────────────────────────────────────┤
│ 📊 ตารางการจองสนาม                  │
│                                     │
│ 🔄 อัปเดตอีกครั้งใน 25 วินาที...    │
│ 📅 Last update: 28/10/2025 21:30   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Booking Table            │ │
│ │ ID | สนาม | วันที่ | เวลา | ... │ │
│ │ 001| A1   |28/10  |09:00| ... │ │
│ │ 002| B2   |28/10  |10:00| ... │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Styling Guidelines
- Use Tailwind CSS classes with `tw-` prefix
- Responsive design (mobile-first)
- Status colors:
  - Confirmed: Green (`tw-text-green-600`)
  - Pending: Yellow (`tw-text-yellow-600`) 
  - Cancelled: Red (`tw-text-red-600`)
- Loading state: Skeleton or spinner
- Error state: Red text with retry option

## Error Handling

### Error Types
1. **Network Errors**: Connection timeout, server unavailable
2. **API Errors**: 4xx/5xx HTTP status codes
3. **Data Errors**: Invalid response format

### Error Display
- Show error message in RefreshStatus component
- Continue countdown timer even during errors
- Automatically retry on next interval
- Log errors to console for debugging

### Fallback Behavior
- If initial load fails: Show "ไม่สามารถโหลดข้อมูลได้"
- If refresh fails: Keep existing data, show error indicator
- If multiple failures: Continue trying, don't disable auto-refresh

## Testing Strategy

### Unit Tests
- Component rendering with different states
- Timer functionality (countdown, auto-refresh)
- Error handling scenarios
- Data formatting and display

### Integration Tests  
- API integration with mock responses
- Full auto-refresh cycle testing
- Error recovery testing

### Manual Testing
- Visual verification of countdown timer
- Data refresh verification
- Mobile responsiveness
- Error state handling

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Use `React.memo` for table rows
2. **Debouncing**: Prevent multiple simultaneous API calls
3. **Cleanup**: Proper interval cleanup on unmount
4. **Caching**: Consider short-term caching for repeated requests

### Memory Management
- Clear intervals on component unmount
- Avoid memory leaks from closures
- Efficient re-rendering with proper dependencies

## Security Considerations

### API Security
- Validate API responses before state updates
- Handle malformed data gracefully
- Rate limiting consideration for auto-refresh

### Client-side Security
- Sanitize displayed data
- Prevent XSS through proper escaping
- Validate date/time formats before display