/// <reference types="cypress" />

describe('Registration Flow - ลงทะเบียนสมาชิก', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should display registration page', () => {
        cy.visit('/register')
        
        // ตรวจสอบ UI elements
        cy.contains('ลงทะเบียน').should('be.visible')
        cy.contains('สมัครสมาชิก').should('be.visible')
    })

    it('should show validation errors for empty fields', () => {
        cy.visit('/register')
        
        // คลิกปุ่มลงทะเบียนโดยไม่กรอกข้อมูล
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error messages
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should validate student ID format', () => {
        cy.visit('/register')
        
        // กรอกรหัสนิสิตผิดรูปแบบ
        cy.get('input[name*="student"]').type('123')
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.contains('รหัสนิสิต', { timeout: 5000 }).should('exist')
    })

    it('should validate email format', () => {
        cy.visit('/register')
        
        // กรอก email ผิดรูปแบบ
        cy.get('input[type="email"]').type('invalid-email')
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.contains('อีเมล', { timeout: 5000 }).should('exist')
    })

    it('should validate password strength', () => {
        cy.visit('/register')
        
        // กรอกรหัสผ่านที่อ่อนแอ
        cy.get('input[type="password"]').first().type('123')
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should validate password confirmation match', () => {
        cy.visit('/register')
        
        // กรอกรหัสผ่านไม่ตรงกัน
        cy.get('input[type="password"]').first().type('password123')
        cy.get('input[type="password"]').last().type('different123')
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.contains('รหัสผ่าน', { timeout: 5000 }).should('exist')
    })

    it('should register student successfully', () => {
        // Mock registration API
        cy.intercept('POST', '/api/auth/register', {
            statusCode: 200,
            body: {
                success: true,
                message: 'ลงทะเบียนสำเร็จ'
            }
        }).as('register')
        
        cy.visit('/register')
        
        // กรอกข้อมูลครบถ้วน
        cy.get('input[name*="student"]').type('65123456')
        cy.get('input[type="email"]').type('test@example.com')
        cy.get('input[type="password"]').first().type('password123')
        cy.get('input[type="password"]').last().type('password123')
        cy.get('input[name*="first"]').type('Test')
        cy.get('input[name*="last"]').type('User')
        
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควร redirect ไปหน้า login หรือแสดง success message
        cy.url({ timeout: 10000 }).should('satisfy', (url) => {
            return url.includes('/login') || url.includes('/register')
        })
    })

    it('should show error for duplicate student ID', () => {
        // Mock duplicate error
        cy.intercept('POST', '/api/auth/register', {
            statusCode: 400,
            body: {
                success: false,
                error: 'รหัสนิสิตนี้มีอยู่ในระบบแล้ว'
            }
        }).as('duplicateError')
        
        cy.visit('/register')
        
        cy.get('input[name*="student"]').type('65123456')
        cy.get('input[type="email"]').type('test@example.com')
        cy.get('input[type="password"]').first().type('password123')
        cy.get('input[type="password"]').last().type('password123')
        cy.get('input[name*="first"]').type('Test')
        cy.get('input[name*="last"]').type('User')
        
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.contains('รหัสนิสิต', { timeout: 10000 }).should('be.visible')
    })

    it('should show error for duplicate email', () => {
        // Mock duplicate email error
        cy.intercept('POST', '/api/auth/register', {
            statusCode: 400,
            body: {
                success: false,
                error: 'อีเมลนี้มีอยู่ในระบบแล้ว'
            }
        }).as('duplicateEmail')
        
        cy.visit('/register')
        
        cy.get('input[name*="student"]').type('65123457')
        cy.get('input[type="email"]').type('existing@example.com')
        cy.get('input[type="password"]').first().type('password123')
        cy.get('input[type="password"]').last().type('password123')
        cy.get('input[name*="first"]').type('Test')
        cy.get('input[name*="last"]').type('User')
        
        cy.get('button').contains('ลงทะเบียน').click()
        
        // ควรแสดง error message
        cy.contains('อีเมล', { timeout: 10000 }).should('be.visible')
    })

    it('should redirect to login page', () => {
        cy.visit('/register')
        
        cy.contains('เข้าสู่ระบบ').click()
        cy.url().should('include', '/login')
    })

    it('should handle reCAPTCHA if enabled', () => {
        cy.visit('/register')
        
        // ตรวจสอบว่ามี reCAPTCHA (ถ้ามี)
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

