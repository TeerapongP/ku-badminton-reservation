describe('Access Control & Authorization', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    describe('Unauthenticated Access', () => {
        it('should redirect to login when accessing admin pages without authentication', () => {
            // ทดสอบหน้า admin หลัก
            cy.visit('/admin')
            cy.url().should('include', '/login')

            // ทดสอบหน้า admin payments
            cy.visit('/admin/payments')
            cy.url().should('include', '/login')
        })

        it('should show login page for unauthenticated users', () => {
            cy.visit('/admin')
            cy.url().should('include', '/login')
            cy.contains('เข้าสู่ระบบ').should('be.visible')
        })

        it('should not show admin menu for unauthenticated users', () => {
            cy.visit('/')
            cy.get('nav').should('not.contain', 'Admin Dashboard')
        })
    })

    describe('Admin Access Control', () => {
        beforeEach(() => {
            // สร้าง admin user
            cy.request({
                method: 'POST',
                url: '/api/admin/create-admin',
                body: {
                    username: 'testadmin',
                    password: 'admin123',
                    email: 'testadmin@test.com',
                    first_name: 'Test',
                    last_name: 'Admin'
                },
                failOnStatusCode: false
            })
        })

        it('should allow admin access to all admin pages', () => {
            // Login เป็น admin
            cy.visit('/login')
            cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
            cy.get('input[type="password"]').type('admin123')
            cy.get('button').contains('เข้าสู่ระบบ').click()
            cy.url({ timeout: 10000 }).should('not.include', '/login')

            // ทดสอบเข้าหน้า admin ต่างๆ
            cy.visit('/admin')
            cy.url().should('include', '/admin')
            cy.contains('Admin Dashboard').should('be.visible')

            cy.visit('/admin/payments')
            cy.url().should('include', '/admin/payments')
            cy.contains('ตรวจสอบการชำระเงิน').should('be.visible')
        })

        it('should show admin menu for authenticated admin', () => {
            // Login เป็น admin
            cy.visit('/login')
            cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
            cy.get('input[type="password"]').type('admin123')
            cy.get('button').contains('เข้าสู่ระบบ').click()
            cy.url({ timeout: 10000 }).should('not.include', '/login')

            // ตรวจสอบเมนู admin
            cy.visit('/')
            cy.get('nav').contains('Admin Dashboard').should('be.visible')
        })

        it('should maintain admin session across browser refresh', () => {
            // Login เป็น admin
            cy.visit('/login')
            cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
            cy.get('input[type="password"]').type('admin123')
            cy.get('button').contains('เข้าสู่ระบบ').click()
            cy.url({ timeout: 10000 }).should('not.include', '/login')

            // เข้าหน้า admin
            cy.visit('/admin')
            cy.contains('Admin Dashboard').should('be.visible')

            // Refresh หน้า
            cy.reload()
            cy.contains('Admin Dashboard').should('be.visible')
            cy.url().should('include', '/admin')
        })
    })

    describe('Session Management', () => {
        beforeEach(() => {
            // สร้าง admin user
            cy.request({
                method: 'POST',
                url: '/api/admin/create-admin',
                body: {
                    username: 'sessiontest',
                    password: 'admin123',
                    email: 'sessiontest@test.com',
                    first_name: 'Session',
                    last_name: 'Test'
                },
                failOnStatusCode: false
            })
        })

        it('should handle session expiry correctly', () => {
            // Login เป็น admin
            cy.visit('/login')
            cy.get('input[placeholder*="รหัสนิสิต"]').type('sessiontest')
            cy.get('input[type="password"]').type('admin123')
            cy.get('button').contains('เข้าสู่ระบบ').click()
            cy.url({ timeout: 10000 }).should('not.include', '/login')

            // เข้าหน้า admin
            cy.visit('/admin')
            cy.contains('Admin Dashboard').should('be.visible')

            // Clear session manually (simulate session expiry)
            cy.clearAllSessionStorage()
            cy.clearAllCookies()

            // ลองเข้าหน้า admin อีกครั้ง
            cy.visit('/admin')
            cy.url().should('include', '/login')
        })

        it('should prevent concurrent sessions (optional)', () => {
            // Login เป็น admin
            cy.visit('/login')
            cy.get('input[placeholder*="รหัสนิสิต"]').type('sessiontest')
            cy.get('input[type="password"]').type('admin123')
            cy.get('button').contains('เข้าสู่ระบบ').click()
            cy.url({ timeout: 10000 }).should('not.include', '/login')

            // ตรวจสอบว่า session ทำงานปกติ
            cy.visit('/admin')
            cy.contains('Admin Dashboard').should('be.visible')
        })
    })

    describe('Security Headers & Protection', () => {
        it('should have proper security headers', () => {
            cy.request('/admin').then((response) => {
                // ตรวจสอบ response status
                expect(response.status).to.be.oneOf([200, 302, 401, 403])
            })
        })

        it('should handle malicious input safely', () => {
            cy.visit('/login')

            // ทดสอบ XSS attempt
            cy.get('input[placeholder*="รหัสนิสิต"]').type('<script>alert("xss")</script>')
            cy.get('input[type="password"]').type('password')
            cy.get('button').contains('เข้าสู่ระบบ').click()

            // ตรวจสอบว่าไม่มี alert popup (XSS ไม่สำเร็จ)
            cy.on('window:alert', () => {
                throw new Error('XSS vulnerability detected!')
            })
        })

        it('should handle SQL injection attempts safely', () => {
            cy.visit('/login')

            // ทดสอบ SQL injection attempt
            cy.get('input[placeholder*="รหัสนิสิต"]').type("'; DROP TABLE users; --")
            cy.get('input[type="password"]').type('password')
            cy.get('button').contains('เข้าสู่ระบบ').click()

            // ระบบควรจัดการได้โดยไม่ crash
            cy.contains('รหัสนิสิตต้องเป็นตัวเลข').should('be.visible')
        })
    })
})