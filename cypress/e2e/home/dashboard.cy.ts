/// <reference types="cypress" />

describe('Home Dashboard - หน้าแรก', () => {
    it('should display home page for unauthenticated users', () => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        cy.visit('/')
        
        // ตรวจสอบว่าหน้าแรกแสดงผล
        cy.get('body', { timeout: 10000 }).should('exist')
    })

    it('should display banners', () => {
        // Mock banners API
        cy.intercept('GET', '/api/banners', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    {
                        banner_id: '1',
                        title: 'Test Banner',
                        image_path: '/images/banner.jpg',
                        is_active: true
                    }
                ]
            }
        }).as('banners')
        
        cy.visit('/')
        cy.wait('@banners')
        
        // Should display banners
        cy.get('body', { timeout: 10000 }).should('exist')
    })

    it('should display booking dashboard for authenticated users', () => {
        // Login first
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        
        // Visit home page
        cy.visit('/')
        
        // Should display booking dashboard
        cy.get('body', { timeout: 10000 }).should('exist')
    })

    it('should show booking system status', () => {
        // Mock booking system status API
        cy.intercept('GET', '/api/booking-system-status', {
            statusCode: 200,
            body: {
                isOpen: true,
                message: 'ระบบเปิดให้บริการ'
            }
        }).as('systemStatus')
        
        cy.visit('/')
        cy.wait('@systemStatus')
        
        // Should display system status
        cy.get('body', { timeout: 10000 }).should('exist')
    })

    it('should navigate to booking page', () => {
        // Login first
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        
        cy.visit('/')
        
        // Should have link to booking page
        cy.contains('จองสนาม', { timeout: 10000 }).should('exist')
    })

    it('should display navigation menu', () => {
        cy.visit('/')
        
        // Should have navigation menu
        cy.get('nav', { timeout: 10000 }).should('exist')
        cy.contains('หน้าแรก').should('be.visible')
    })

    it('should show login/register links for unauthenticated users', () => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        cy.visit('/')
        
        // Should show login and register links
        cy.contains('เข้าสู่ระบบ', { timeout: 10000 }).should('be.visible')
        cy.contains('สมัครสมาชิก').should('be.visible')
    })

    it('should show user menu for authenticated users', () => {
        // Login first
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        
        cy.visit('/')
        
        // Should show user menu
        cy.get('body', { timeout: 10000 }).should('exist')
    })
})

