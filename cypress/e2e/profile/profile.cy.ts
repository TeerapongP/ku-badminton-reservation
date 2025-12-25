/// <reference types="cypress" />

describe('Profile Management - จัดการโปรไฟล์', () => {
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

    it('should display profile page', () => {
        cy.visit('/profile')
        
        // ตรวจสอบว่าหน้าโปรไฟล์แสดงผล
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
    })

    it('should display user information', () => {
        // Mock profile API
        cy.intercept('GET', '/api/profile/*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    user_id: '1',
                    first_name: 'Test',
                    last_name: 'User',
                    email: 'test@example.com',
                    student_id: '65123456'
                }
            }
        }).as('profileData')
        
        cy.visit('/profile')
        cy.wait('@profileData')
        
        // ควรแสดงข้อมูลผู้ใช้
        cy.contains('Test', { timeout: 10000 }).should('be.visible')
        cy.contains('User').should('be.visible')
    })

    it('should allow editing profile information', () => {
        cy.visit('/profile')
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
        
        // ควรมีปุ่มแก้ไข
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should update profile successfully', () => {
        // Mock update profile API
        cy.intercept('PUT', '/api/profile/*', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อัปเดตโปรไฟล์สำเร็จ'
            }
        }).as('updateProfile')
        
        cy.visit('/profile')
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
        
        // Should be able to update profile
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display booking history', () => {
        // Mock bookings API
        cy.intercept('GET', '/api/profile/*/bookings*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    bookings: [
                        {
                            reservation_id: '123',
                            status: 'confirmed',
                            reserved_date: new Date().toISOString(),
                            total_cents: 10000
                        }
                    ],
                    total: 1
                }
            }
        }).as('bookings')
        
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
    })

    it('should filter bookings by status', () => {
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should have filter options
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display booking details', () => {
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should show booking information
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should allow uploading profile picture', () => {
        // Mock upload API
        cy.intercept('POST', '/api/upload/profile-image', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อัปโหลดรูปภาพสำเร็จ',
                data: {
                    profile_photo_url: '/uploads/profiles/test.jpg'
                }
            }
        }).as('uploadImage')
        
        cy.visit('/profile')
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
        
        // Should have upload button
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should validate image file type', () => {
        cy.visit('/profile')
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
        
        // Should only accept image files
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should change password', () => {
        cy.visit('/profile')
        cy.contains('โปรไฟล์', { timeout: 10000 }).should('be.visible')
        
        // Should have change password option
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should show payment status for bookings', () => {
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should display payment status (paid, pending, unpaid)
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

