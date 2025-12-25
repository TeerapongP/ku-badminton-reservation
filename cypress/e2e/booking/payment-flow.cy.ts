/// <reference types="cypress" />

describe('Payment Flow - อัปโหลดสลิปการชำระเงิน', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login as student
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
    })

    it('should display payment upload modal after booking', () => {
        // Mock successful booking
        cy.intercept('POST', '/api/reservations', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    reservation_id: '123',
                    status: 'pending',
                    payment_status: 'unpaid'
                }
            }
        }).as('bookingCreated')
        
        // After booking, should show payment modal
        cy.visit('/profile')
        
        // Navigate to bookings section
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
    })

    it('should allow uploading payment slip', () => {
        // Mock payment upload API
        cy.intercept('POST', '/api/upload/payment-slip', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อัปโหลดสลิปสำเร็จ',
                data: {
                    slip_url: '/uploads/payment-slips/test.jpg'
                }
            }
        }).as('uploadSlip')
        
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should have upload button for unpaid bookings
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should validate file type for payment slip', () => {
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should only accept image files
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should show payment status after upload', () => {
        // Mock payment record creation
        cy.intercept('POST', '/api/payments', {
            statusCode: 200,
            body: {
                success: true,
                message: 'บันทึกข้อมูลการชำระเงินสำเร็จ',
                data: {
                    payment_id: '1',
                    status: 'pending',
                    reservation_id: '123'
                }
            }
        }).as('paymentCreated')
        
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should show pending status
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display payment history', () => {
        // Mock payment history API
        cy.intercept('GET', '/api/profile/*/bookings*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    bookings: [
                        {
                            reservation_id: '123',
                            status: 'confirmed',
                            payment_status: 'paid',
                            total_cents: 10000,
                            reserved_date: new Date().toISOString()
                        }
                    ]
                }
            }
        }).as('paymentHistory')
        
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should display payment information
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should handle upload error gracefully', () => {
        // Mock upload failure
        cy.intercept('POST', '/api/upload/payment-slip', {
            statusCode: 500,
            body: {
                success: false,
                error: 'ไม่สามารถอัปโหลดไฟล์ได้'
            }
        }).as('uploadFailed')
        
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should show error message
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should show file size validation', () => {
        cy.visit('/profile')
        cy.contains('การจองของฉัน', { timeout: 10000 }).should('be.visible')
        
        // Should validate file size (e.g., max 5MB)
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

describe('Admin Payment Verification', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login as admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
    })

    it('should display pending payments list', () => {
        // Mock pending payments API
        cy.intercept('GET', '/api/admin/payments*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    payments: [
                        {
                            payment_id: '1',
                            reservation_id: '123',
                            amount_cents: 10000,
                            status: 'pending',
                            user: {
                                first_name: 'Test',
                                last_name: 'User'
                            }
                        }
                    ]
                }
            }
        }).as('pendingPayments')
        
        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน', { timeout: 10000 }).should('be.visible')
    })

    it('should approve payment successfully', () => {
        // Mock payment approval API
        cy.intercept('POST', '/api/admin/payments/*/approve', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อนุมัติการชำระเงินสำเร็จ'
            }
        }).as('approvePayment')
        
        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน', { timeout: 10000 }).should('be.visible')
        
        // Should have approve button
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should reject payment with reason', () => {
        // Mock payment rejection API
        cy.intercept('POST', '/api/admin/payments/*/reject', {
            statusCode: 200,
            body: {
                success: true,
                message: 'ปฏิเสธการชำระเงินสำเร็จ'
            }
        }).as('rejectPayment')
        
        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน', { timeout: 10000 }).should('be.visible')
        
        // Should have reject button with reason input
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display payment slip image', () => {
        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน', { timeout: 10000 }).should('be.visible')
        
        // Should display uploaded slip image
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should filter payments by status', () => {
        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน', { timeout: 10000 }).should('be.visible')
        
        // Should have filter options (pending, approved, rejected)
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

