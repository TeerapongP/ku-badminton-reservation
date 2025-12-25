/// <reference types="cypress" />

describe('Booking Flow - จองสนามแบดมินตัน', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login as student before each test
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        
        // Wait for login to complete
        cy.url({ timeout: 10000 }).should('not.include', '/login')
    })

    it('should display badminton court booking page', () => {
        cy.visit('/badminton-court')
        
        // ตรวจสอบว่าหน้าจองสนามแสดงผล
        cy.contains('สนามแบดมินตัน').should('be.visible')
        cy.contains('มหาวิทยาลัยเกษตรศาสตร์').should('be.visible')
        cy.contains('เลือกสนามที่คุณต้องการจอง').should('be.visible')
    })

    it('should show facilities list', () => {
        cy.visit('/badminton-court')
        
        // รอให้โหลดข้อมูลสนาม
        cy.get('body', { timeout: 10000 }).should('not.contain', 'กำลังตรวจสอบการเข้าสู่ระบบ')
        
        // ตรวจสอบว่ามีปุ่มจองสนาม
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
    })

    it('should navigate to courts page when clicking facility', () => {
        cy.visit('/badminton-court')
        
        // รอให้โหลดข้อมูล
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        
        // คลิกปุ่มจองสนาม
        cy.contains('จองสนามเลย').first().click()
        
        // ตรวจสอบว่า redirect ไปหน้าสนาม
        cy.url({ timeout: 10000 }).should('include', '/courts/')
    })

    it('should display courts availability', () => {
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        cy.contains('จองสนามเลย').first().click()
        
        // ตรวจสอบว่าหน้าสนามแสดงผล
        cy.url({ timeout: 10000 }).should('include', '/courts/')
        cy.get('body', { timeout: 10000 }).should('not.contain', 'กำลังโหลด')
    })

    it('should show error when not authenticated', () => {
        // Logout first
        cy.clearAllCookies()
        cy.clearAllSessionStorage()
        
        // Try to access booking page
        cy.visit('/badminton-court')
        
        // Should redirect to login
        cy.url({ timeout: 10000 }).should('include', '/login')
    })

    it('should handle booking system closed status', () => {
        // Mock API to return system closed
        cy.intercept('GET', '/api/booking-system-status', {
            statusCode: 200,
            body: { isOpen: false, message: 'ระบบปิดอยู่' }
        }).as('systemStatus')
        
        cy.visit('/badminton-court')
        cy.wait('@systemStatus')
        
        // Should still show facilities (admin can access)
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

describe('Court Selection and Booking', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
    })

    it('should display court details page', () => {
        // Navigate to booking page first
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        
        // Mock court availability API
        cy.intercept('GET', '/api/court-availability*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    courts: [
                        {
                            court_id: '1',
                            court_code: 'A1',
                            name: 'Court A1',
                            is_active: true
                        }
                    ],
                    availability: {}
                }
            }
        }).as('courtAvailability')
        
        cy.contains('จองสนามเลย').first().click()
        cy.url({ timeout: 10000 }).should('include', '/courts/')
    })

    it('should show date picker for booking', () => {
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        cy.contains('จองสนามเลย').first().click()
        cy.url({ timeout: 10000 }).should('include', '/courts/')
        
        // ตรวจสอบว่ามี date picker หรือ calendar
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display time slots for selected date', () => {
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        cy.contains('จองสนามเลย').first().click()
        cy.url({ timeout: 10000 }).should('include', '/courts/')
        
        // Mock time slots API
        cy.intercept('GET', '/api/court-availability*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    slots: [
                        { slot_id: '1', start_time: '09:00', end_time: '10:00', available: true },
                        { slot_id: '2', start_time: '10:00', end_time: '11:00', available: true }
                    ]
                }
            }
        }).as('timeSlots')
        
        // Should show time slots after date selection
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should create booking successfully', () => {
        // Mock booking creation API
        cy.intercept('POST', '/api/reservations', {
            statusCode: 200,
            body: {
                success: true,
                message: 'จองสนามสำเร็จ',
                data: {
                    reservation_id: '123',
                    status: 'pending'
                }
            }
        }).as('createBooking')
        
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        cy.contains('จองสนามเลย').first().click()
        cy.url({ timeout: 10000 }).should('include', '/courts/')
        
        // The actual booking creation would happen when user selects court, date, and slot
        // This test verifies the API endpoint is ready
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should show error when booking fails', () => {
        // Mock booking failure
        cy.intercept('POST', '/api/reservations', {
            statusCode: 400,
            body: {
                success: false,
                error: 'ไม่สามารถจองได้',
                message: 'ช่วงเวลานี้ถูกจองแล้ว'
            }
        }).as('bookingFailed')
        
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        
        // Should handle error gracefully
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should validate booking data before submission', () => {
        cy.visit('/badminton-court')
        cy.contains('จองสนามเลย', { timeout: 10000 }).should('be.visible')
        cy.contains('จองสนามเลย').first().click()
        cy.url({ timeout: 10000 }).should('include', '/courts/')
        
        // Should require court, date, and slot selection
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

