/// <reference types="cypress" />

describe('Forgot Password Flow - ลืมรหัสผ่าน', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should display forgot password page', () => {
        cy.visit('/forgot-password')
        
        // ตรวจสอบ UI elements
        cy.contains('ลืมรหัสผ่าน').should('be.visible')
        cy.contains('อีเมล').should('be.visible')
    })

    it('should show validation error for empty email', () => {
        cy.visit('/forgot-password')
        
        // คลิกปุ่มส่งโดยไม่กรอกอีเมล
        cy.get('button').contains('ส่ง').click()
        
        // ควรแสดง error message
        cy.contains('อีเมล', { timeout: 5000 }).should('exist')
    })

    it('should validate email format', () => {
        cy.visit('/forgot-password')
        
        // กรอก email ผิดรูปแบบ
        cy.get('input[type="email"]').type('invalid-email')
        cy.get('button').contains('ส่ง').click()
        
        // ควรแสดง error message
        cy.contains('อีเมล', { timeout: 5000 }).should('exist')
    })

    it('should send reset password email successfully', () => {
        // Mock forgot password API
        cy.intercept('POST', '/api/auth/forgot-password', {
            statusCode: 200,
            body: {
                success: true,
                message: 'ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ'
            }
        }).as('forgotPassword')
        
        cy.visit('/forgot-password')
        
        cy.get('input[type="email"]').type('test@example.com')
        cy.get('button').contains('ส่ง').click()
        
        // ควรแสดง success message
        cy.contains('ส่งอีเมล', { timeout: 10000 }).should('be.visible')
    })

    it('should show error for non-existent email', () => {
        // Mock error for non-existent user
        cy.intercept('POST', '/api/auth/forgot-password', {
            statusCode: 404,
            body: {
                success: false,
                error: 'ไม่พบผู้ใช้ในระบบ'
            }
        }).as('userNotFound')
        
        cy.visit('/forgot-password')
        
        cy.get('input[type="email"]').type('nonexistent@example.com')
        cy.get('button').contains('ส่ง').click()
        
        // ควรแสดง error message
        cy.contains('ไม่พบ', { timeout: 10000 }).should('be.visible')
    })

    it('should redirect to login page', () => {
        cy.visit('/forgot-password')
        
        cy.contains('เข้าสู่ระบบ').click()
        cy.url().should('include', '/login')
    })

    it('should show loading state during submission', () => {
        cy.visit('/forgot-password')
        
        cy.get('input[type="email"]').type('test@example.com')
        cy.get('button').contains('ส่ง').click()
        
        // ควรแสดง loading state
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

describe('Reset Password Flow', () => {
    it('should display reset password page with valid token', () => {
        // Mock valid token
        cy.visit('/reset-password?token=valid-token')
        
        // ตรวจสอบ UI elements
        cy.contains('รีเซ็ตรหัสผ่าน').should('be.visible')
        cy.get('input[type="password"]').should('have.length.at.least', 1)
    })

    it('should show error for invalid token', () => {
        // Mock invalid token
        cy.intercept('GET', '/api/auth/reset-password*', {
            statusCode: 400,
            body: {
                success: false,
                error: 'Token ไม่ถูกต้องหรือหมดอายุ'
            }
        }).as('invalidToken')
        
        cy.visit('/reset-password?token=invalid-token')
        
        // ควรแสดง error message
        cy.contains('Token', { timeout: 10000 }).should('be.visible')
    })

    it('should validate password strength', () => {
        cy.visit('/reset-password?token=valid-token')
        
        // กรอกรหัสผ่านที่อ่อนแอ
        cy.get('input[type="password"]').first().type('123')
        cy.get('button').contains('รีเซ็ต').click()
        
        // ควรแสดง error message
        cy.contains('รหัสผ่าน', { timeout: 5000 }).should('exist')
    })

    it('should validate password confirmation match', () => {
        cy.visit('/reset-password?token=valid-token')
        
        // กรอกรหัสผ่านไม่ตรงกัน
        cy.get('input[type="password"]').first().type('password123')
        cy.get('input[type="password"]').last().type('different123')
        cy.get('button').contains('รีเซ็ต').click()
        
        // ควรแสดง error message
        cy.contains('รหัสผ่าน', { timeout: 5000 }).should('exist')
    })

    it('should reset password successfully', () => {
        // Mock reset password API
        cy.intercept('POST', '/api/auth/reset-password', {
            statusCode: 200,
            body: {
                success: true,
                message: 'รีเซ็ตรหัสผ่านสำเร็จ'
            }
        }).as('resetPassword')
        
        cy.visit('/reset-password?token=valid-token')
        
        cy.get('input[type="password"]').first().type('newpassword123')
        cy.get('input[type="password"]').last().type('newpassword123')
        cy.get('button').contains('รีเซ็ต').click()
        
        // ควร redirect ไปหน้า login
        cy.url({ timeout: 10000 }).should('include', '/login')
    })
})

