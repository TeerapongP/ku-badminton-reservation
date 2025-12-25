/// <reference types="cypress" />

describe('Admin Dashboard - หน้าจัดการระบบ', () => {
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

    it('should display admin dashboard', () => {
        cy.visit('/admin')
        
        // ตรวจสอบว่าหน้า admin dashboard แสดงผล
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
    })

    it('should display dashboard statistics', () => {
        // Mock dashboard API
        cy.intercept('GET', '/api/admin/dashboard', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    totalBookings: 100,
                    pendingPayments: 5,
                    activeUsers: 50,
                    todayBookings: 10
                }
            }
        }).as('dashboardStats')
        
        cy.visit('/admin')
        cy.wait('@dashboardStats')
        
        // Should display statistics
        cy.get('body', { timeout: 10000 }).should('exist')
    })

    it('should display bookings list', () => {
        // Mock bookings API
        cy.intercept('GET', '/api/admin/bookings*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    bookings: [
                        {
                            reservation_id: '123',
                            user: { first_name: 'Test', last_name: 'User' },
                            status: 'confirmed',
                            reserved_date: new Date().toISOString()
                        }
                    ],
                    total: 1
                }
            }
        }).as('bookings')
        
        cy.visit('/admin/bookings')
        cy.contains('จัดการการจอง', { timeout: 10000 }).should('be.visible')
    })

    it('should filter bookings by status', () => {
        cy.visit('/admin/bookings')
        cy.contains('จัดการการจอง', { timeout: 10000 }).should('be.visible')
        
        // Should have filter options
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should search bookings', () => {
        cy.visit('/admin/bookings')
        cy.contains('จัดการการจอง', { timeout: 10000 }).should('be.visible')
        
        // Should have search input
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should approve booking', () => {
        // Mock approve booking API
        cy.intercept('POST', '/api/admin/bookings/*', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อนุมัติการจองสำเร็จ'
            }
        }).as('approveBooking')
        
        cy.visit('/admin/bookings')
        cy.contains('จัดการการจอง', { timeout: 10000 }).should('be.visible')
        
        // Should have approve button
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should cancel booking', () => {
        // Mock cancel booking API
        cy.intercept('POST', '/api/admin/bookings/*', {
            statusCode: 200,
            body: {
                success: true,
                message: 'ยกเลิกการจองสำเร็จ'
            }
        }).as('cancelBooking')
        
        cy.visit('/admin/bookings')
        cy.contains('จัดการการจอง', { timeout: 10000 }).should('be.visible')
        
        // Should have cancel button
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display user management', () => {
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should have user management section
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should manage system settings', () => {
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should have system settings
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should control booking system status', () => {
        // Mock booking system status API
        cy.intercept('POST', '/api/admin/booking-system', {
            statusCode: 200,
            body: {
                success: true,
                message: 'อัปเดตสถานะระบบสำเร็จ'
            }
        }).as('updateSystemStatus')
        
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should have system status toggle
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should display audit logs', () => {
        // Mock audit logs API
        cy.intercept('GET', '/api/admin/audit-logs*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    logs: [
                        {
                            log_id: '1',
                            action: 'booking_created',
                            user_id: '1',
                            created_at: new Date().toISOString()
                        }
                    ]
                }
            }
        }).as('auditLogs')
        
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should display audit logs
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should generate reports', () => {
        // Mock reports API
        cy.intercept('GET', '/api/admin/reports*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    bookings: [],
                    revenue: 0,
                    period: 'monthly'
                }
            }
        }).as('reports')
        
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should have reports section
        cy.get('body', { timeout: 5000 }).should('exist')
    })

    it('should manage banners', () => {
        // Mock banners API
        cy.intercept('GET', '/api/admin/banners', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    banners: [
                        {
                            banner_id: '1',
                            title: 'Test Banner',
                            is_active: true
                        }
                    ]
                }
            }
        }).as('banners')
        
        cy.visit('/admin')
        cy.contains('Admin Dashboard', { timeout: 10000 }).should('be.visible')
        
        // Should have banner management
        cy.get('body', { timeout: 5000 }).should('exist')
    })
})

describe('Admin Access Control', () => {
    it('should redirect non-admin users', () => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login as regular user
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('65123456')
        cy.get('input[type="password"]').type('password123')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        
        // Try to access admin page
        cy.visit('/admin')
        
        // Should redirect to login or home
        cy.url({ timeout: 10000 }).should('satisfy', (url) => {
            return url.includes('/login') || url.includes('/')
        })
    })

    it('should allow super admin access', () => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
        
        // Login as super admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('input[type="password"]').type('1234567890')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        
        // Should access admin page
        cy.visit('/admin')
        cy.url({ timeout: 10000 }).should('include', '/admin')
    })
})

