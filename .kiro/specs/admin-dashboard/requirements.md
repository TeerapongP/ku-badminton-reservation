# Requirements Document

## Introduction

ระบบ Admin Dashboard สำหรับระบบจองสนามแบดมินตันออนไลน์ เป็นส่วนที่ให้ผู้ดูแลระบบ (Admin) สามารถจัดการสมาชิก ตรวจสอบการชำระเงิน ควบคุมการจอง และจัดการระบบโดยรวมได้อย่างมีประสิทธิภาพ ระบบนี้จะช่วยให้ Admin สามารถทำงานได้สะดวกและรวดเร็วมากขึ้น

## Requirements

### Requirement 1: การจัดการสมาชิก (Member Management)

**User Story:** As an admin, I want to manage user registrations and member accounts, so that I can approve new members and maintain user data integrity.

#### Acceptance Criteria

1. WHEN admin accesses the member management page THEN system SHALL display a list of all registered users with their status (pending, active, inactive, suspended)
2. WHEN admin views a pending registration THEN system SHALL show complete user information including personal details, contact information, and uploaded documents
3. WHEN admin approves a pending registration THEN system SHALL change user status to active AND send notification to user via email
4. WHEN admin rejects a pending registration THEN system SHALL change user status to rejected AND allow admin to specify rejection reason
5. WHEN admin searches for a specific member THEN system SHALL provide search functionality by name, student ID, national ID, email, or phone number
6. WHEN admin views member details THEN system SHALL display complete profile information, booking history, and payment records
7. WHEN admin needs to suspend a member THEN system SHALL allow status change to suspended AND prevent user from making new bookings
8. WHEN admin reactivates a suspended member THEN system SHALL change status to active AND restore booking privileges

### Requirement 2: การตรวจสอบและอนุมัติการชำระเงิน (Payment Verification)

**User Story:** As an admin, I want to verify payment slips and approve transactions, so that I can ensure accurate payment processing and booking confirmation.

#### Acceptance Criteria

1. WHEN admin accesses payment verification page THEN system SHALL display all pending payment verifications with reservation details
2. WHEN admin views a payment slip THEN system SHALL show uploaded image, booking details, and expected payment amount
3. WHEN admin approves a payment THEN system SHALL change reservation status to paid AND update payment record with approval timestamp
4. WHEN admin rejects a payment THEN system SHALL change reservation status to rejected AND allow admin to specify rejection reason
5. WHEN admin processes a payment THEN system SHALL send notification to user about payment status
6. WHEN admin views payment history THEN system SHALL display all processed payments with filter options by date, amount, and status
7. WHEN payment is approved THEN system SHALL automatically generate booking confirmation for the user
8. IF payment verification is not completed within 24 hours THEN system SHALL send reminder notification to admin

### Requirement 3: การจองสนามแบบ Admin (Advanced Booking Management)

**User Story:** As an admin, I want to have advanced booking capabilities, so that I can manage facility reservations for official university activities and events.

#### Acceptance Criteria

1. WHEN admin creates a booking THEN system SHALL allow booking multiple courts simultaneously without daily limits
2. WHEN admin makes advance bookings THEN system SHALL allow reservations for any future date without restriction
3. WHEN admin creates recurring bookings THEN system SHALL provide weekly/monthly recurring options with end date specification
4. WHEN admin books for official activities THEN system SHALL require selection of booking reason from predefined categories
5. WHEN admin books consecutive time slots THEN system SHALL allow booking multiple continuous hours on same or different courts
6. WHEN admin creates a booking THEN system SHALL automatically mark it as confirmed without payment requirement
7. WHEN admin cancels any booking THEN system SHALL allow cancellation with reason specification and automatic refund processing if applicable
8. WHEN admin views booking calendar THEN system SHALL display all bookings with different visual indicators for user bookings vs admin bookings

### Requirement 4: การควบคุมระบบ (System Control)

**User Story:** As an admin, I want to control system operations and facility availability, so that I can manage maintenance periods and system-wide settings.

#### Acceptance Criteria

1. WHEN admin needs to disable booking system THEN system SHALL provide toggle to enable/disable booking functionality with custom message display
2. WHEN admin sets facility maintenance THEN system SHALL allow creation of blackout periods for specific courts or entire facilities
3. WHEN admin creates blackout period THEN system SHALL prevent new bookings for affected courts/times AND notify existing reservation holders
4. WHEN admin manages time slots THEN system SHALL allow modification of available booking time slots per facility
5. WHEN admin updates pricing THEN system SHALL provide interface to modify court pricing by user type, time slot, and date range
6. WHEN admin resets daily bookings THEN system SHALL provide functionality to clear all bookings for specific date with confirmation
7. WHEN admin manages booking policies THEN system SHALL allow modification of booking limits, advance booking days, and payment timeout
8. WHEN system maintenance is scheduled THEN system SHALL display maintenance notice to users with estimated completion time

### Requirement 5: การออกรายงาน (Reporting and Analytics)

**User Story:** As an admin, I want to generate comprehensive reports, so that I can analyze facility usage and make data-driven decisions.

#### Acceptance Criteria

1. WHEN admin generates usage reports THEN system SHALL provide booking statistics by date range, facility, court, and time slot
2. WHEN admin views revenue reports THEN system SHALL display payment summaries with breakdown by user type and booking period
3. WHEN admin exports reports THEN system SHALL support PDF and Excel formats with customizable data fields
4. WHEN admin analyzes peak usage THEN system SHALL provide visual charts showing busiest times, courts, and days
5. WHEN admin reviews member activity THEN system SHALL show user booking patterns and frequency statistics
6. WHEN admin tracks payment status THEN system SHALL provide pending payments report with aging analysis
7. WHEN admin monitors system performance THEN system SHALL display booking success rates and payment completion rates
8. WHEN admin schedules reports THEN system SHALL allow automated report generation and email delivery

### Requirement 6: การจัดการข้อมูลพื้นฐาน (Master Data Management)

**User Story:** As an admin, I want to manage facility and system master data, so that I can maintain accurate information and system configuration.

#### Acceptance Criteria

1. WHEN admin manages facilities THEN system SHALL allow creation, modification, and deactivation of facilities with complete details
2. WHEN admin manages courts THEN system SHALL provide interface to add, edit, and manage court information including images and specifications
3. WHEN admin sets operating hours THEN system SHALL allow configuration of facility opening hours by day of week
4. WHEN admin manages user roles THEN system SHALL provide role assignment and permission management functionality
5. WHEN admin updates system settings THEN system SHALL allow modification of global settings like payment timeout, booking limits, and notification preferences
6. WHEN admin manages pricing rules THEN system SHALL provide comprehensive pricing management with effective date ranges and user type differentiation
7. WHEN admin handles data backup THEN system SHALL provide manual backup trigger and backup status monitoring
8. WHEN admin manages notifications THEN system SHALL allow customization of email templates and notification triggers

### Requirement 7: การตรวจสอบและบันทึกเหตุการณ์ (Audit and Logging)

**User Story:** As an admin, I want to monitor system activities and maintain audit trails, so that I can ensure system security and track important events.

#### Acceptance Criteria

1. WHEN admin views audit logs THEN system SHALL display all user activities including login attempts, booking actions, and payment submissions
2. WHEN admin monitors security events THEN system SHALL show failed login attempts, suspicious activities, and account lockouts
3. WHEN admin tracks booking changes THEN system SHALL maintain complete history of booking modifications, cancellations, and status changes
4. WHEN admin reviews payment activities THEN system SHALL log all payment-related actions including approvals, rejections, and refunds
5. WHEN admin searches logs THEN system SHALL provide filtering by date range, user, action type, and IP address
6. WHEN admin exports audit data THEN system SHALL support export of log data for compliance and analysis purposes
7. WHEN system detects anomalies THEN system SHALL alert admin about unusual patterns or potential security issues
8. WHEN admin investigates issues THEN system SHALL provide detailed event timeline with user context and system state information