# Implementation Plan - Dashboard Auto-refresh Booking Table

## Task Overview
Convert the dashboard auto-refresh design into actionable coding tasks that build incrementally toward a complete auto-refreshing booking table with countdown timer and last update display.

## Implementation Tasks

- [ ] 1. Create API endpoint for dashboard booking data
  - Create `/api/bookings/dashboard` GET endpoint
  - Implement database query to fetch current and future bookings
  - Add proper error handling and response formatting
  - Return bookings sorted by date and time
  - _Requirements: 1.1, 4.1, 4.2_

- [ ] 2. Create core booking interfaces and types
  - Define Booking interface with all required fields
  - Create BookingResponse interface for API responses
  - Add BookingStatus type definition
  - Export interfaces from types directory
  - _Requirements: 4.1, 4.3_

- [ ] 3. Build RefreshStatus component
  - [ ] 3.1 Create countdown timer functionality
    - Implement countdown state (30 to 0 seconds)
    - Add countdown display with Thai text format
    - Handle countdown reset logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 3.2 Add last update time display
    - Format timestamp in DD/MM/YYYY HH:MM format
    - Use Thai timezone (UTC+7)
    - Handle null/error states appropriately
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [ ] 3.3 Integrate error state display
    - Show error messages when data fetch fails
    - Style error states with appropriate colors
    - Maintain countdown during error states
    - _Requirements: 5.2, 5.3_

- [ ] 4. Build BookingTable component
  - [ ] 4.1 Create table structure and headers
    - Design responsive table layout
    - Add proper column headers (ID, สนาม, วันที่, เวลา, ผู้จอง, สถานะ)
    - Implement mobile-responsive design
    - _Requirements: 4.1, 4.4_
  
  - [ ] 4.2 Implement booking row rendering
    - Create BookingTableRow component
    - Add status color coding (green/yellow/red)
    - Format date and time display properly
    - Handle empty state display
    - _Requirements: 4.3, 4.5_
  
  - [ ] 4.3 Add loading and error states
    - Implement loading skeleton/spinner
    - Show "ไม่มีข้อมูลการจอง" for empty data
    - Handle data formatting errors gracefully
    - _Requirements: 4.5, 5.2_

- [ ] 5. Create main BookingDashboard component
  - [ ] 5.1 Implement data fetching logic
    - Create fetchBookings function with error handling
    - Add loading state management
    - Implement proper error logging
    - _Requirements: 1.1, 1.4, 5.5_
  
  - [ ] 5.2 Setup auto-refresh mechanism
    - Implement 30-second interval for data refresh
    - Add proper interval cleanup on unmount
    - Handle multiple timer management
    - _Requirements: 1.2, 1.3, 1.5_
  
  - [ ] 5.3 Integrate countdown timer
    - Setup 1-second interval for countdown
    - Synchronize countdown with refresh cycle
    - Reset countdown on successful data fetch
    - _Requirements: 2.2, 2.3_
  
  - [ ] 5.4 Add comprehensive error handling
    - Handle network failures gracefully
    - Continue auto-refresh during errors
    - Implement retry logic for failed requests
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 6. Integrate dashboard into main page
  - Update src/app/page.tsx to include BookingDashboard
  - Position dashboard below existing Banner component
  - Ensure proper responsive layout
  - Test integration with existing components
  - _Requirements: 1.1, 4.4_

- [ ] 7. Add performance optimizations
  - [ ] 7.1 Implement React.memo for table rows
    - Optimize BookingTableRow component rendering
    - Add proper dependency arrays for useEffect
    - Prevent unnecessary re-renders
    - _Requirements: Performance considerations_
  
  - [ ] 7.2 Add cleanup and memory management
    - Ensure all intervals are cleared on unmount
    - Prevent memory leaks from closures
    - Add debouncing for rapid API calls
    - _Requirements: 1.5, Performance considerations_

- [ ]* 8. Create comprehensive test suite
  - [ ]* 8.1 Write unit tests for components
    - Test BookingDashboard component states
    - Test RefreshStatus countdown functionality
    - Test BookingTable rendering with different data
    - _Requirements: All components_
  
  - [ ]* 8.2 Add integration tests
    - Test full auto-refresh cycle
    - Test API integration with mock responses
    - Test error recovery scenarios
    - _Requirements: 1.2, 5.3, 5.4_
  
  - [ ]* 8.3 Implement error handling tests
    - Test network failure scenarios
    - Test malformed API response handling
    - Test timer cleanup on component unmount
    - _Requirements: 5.1, 5.2, 5.4_

## Implementation Notes

- Start with API endpoint creation to establish data flow
- Build components incrementally, testing each piece
- Focus on timer management and cleanup to prevent memory leaks
- Ensure responsive design works across all screen sizes
- Test auto-refresh functionality thoroughly before deployment
- Optional test tasks (*) can be implemented for comprehensive coverage but are not required for core functionality