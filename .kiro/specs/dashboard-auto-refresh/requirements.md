# Requirements Document

## Introduction

ระบบแสดงตารางข้อมูลการจองแบดมินตันในหน้าแรก (Dashboard) ที่มีการอัปเดตข้อมูลอัตโนมัติทุก 30 วินาที พร้อมแสดงข้อมูลการนับถอยหลังและเวลาอัปเดตล่าสุด

## Glossary

- **Dashboard**: หน้าแรกของระบบที่แสดงข้อมูลการจองทั้งหมด
- **Booking Table**: ตารางแสดงข้อมูลการจองสนามแบดมินตัน
- **Auto-refresh**: การรีเฟรชข้อมูลอัตโนมัติโดยไม่ต้องให้ผู้ใช้กดปุ่ม
- **Countdown Timer**: ตัวนับถอยหลังที่แสดงเวลาที่เหลือก่อนการอัปเดตครั้งถัดไป
- **Last Update Time**: เวลาที่ทำการอัปเดตข้อมูลครั้งล่าสุด

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the booking table automatically refresh every 30 seconds, so that I can view the most current booking information without manually refreshing the page

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Booking_Table SHALL automatically fetch and display current booking data
2. EVERY 30 seconds, THE Booking_Table SHALL automatically refresh its data from the server
3. WHILE the auto-refresh is active, THE Booking_Table SHALL continue updating without user intervention
4. IF the data fetch fails, THEN THE Booking_Table SHALL retry the request after the next 30-second interval
5. WHEN the component unmounts, THE Booking_Table SHALL clean up all active timers and intervals

### Requirement 2

**User Story:** As a user, I want to see a countdown timer showing when the next update will occur, so that I know when fresh data will be available

#### Acceptance Criteria

1. THE Dashboard SHALL display a countdown timer showing seconds remaining until next update
2. THE countdown timer SHALL start at 30 seconds and count down to 0
3. WHEN the countdown reaches 0, THE countdown timer SHALL reset to 30 seconds
4. THE countdown timer SHALL display text in format "อัปเดตอีกครั้งใน X วินาที..."
5. THE countdown timer SHALL be visible and easily readable by users

### Requirement 3

**User Story:** As a user, I want to see when the data was last updated, so that I can trust the freshness of the information displayed

#### Acceptance Criteria

1. THE Dashboard SHALL display the last update timestamp
2. THE last update time SHALL be shown in format "Last update: DD/MM/YYYY HH:MM"
3. WHEN data is successfully refreshed, THE last update time SHALL be updated to the current timestamp
4. THE last update time SHALL use Thai timezone (UTC+7)
5. IF the initial data load fails, THE last update time SHALL show "ไม่สามารถโหลดข้อมูลได้"

### Requirement 4

**User Story:** As a user, I want the booking table to show comprehensive booking information, so that I can see all relevant details about court reservations

#### Acceptance Criteria

1. THE Booking_Table SHALL display booking ID, court number, date, time slot, user name, and status
2. THE Booking_Table SHALL show bookings in chronological order with upcoming bookings first
3. THE Booking_Table SHALL use appropriate status colors (confirmed, pending, cancelled)
4. THE Booking_Table SHALL be responsive and work on mobile devices
5. WHEN no bookings exist, THE Booking_Table SHALL display "ไม่มีข้อมูลการจอง"

### Requirement 5

**User Story:** As a user, I want the auto-refresh feature to handle errors gracefully, so that the system remains stable even when network issues occur

#### Acceptance Criteria

1. IF a data fetch request fails, THE Dashboard SHALL continue the countdown timer normally
2. WHEN network errors occur, THE Dashboard SHALL show an error indicator without breaking the interface
3. THE Dashboard SHALL automatically retry failed requests on the next scheduled interval
4. IF multiple consecutive requests fail, THE Dashboard SHALL continue attempting updates
5. THE Dashboard SHALL log errors to the console for debugging purposes