describe('Admin Login Flow', () => {
    before(() => {
        // สร้าง admin user ก่อนเริ่ม test suite
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

    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should successfully login as admin with username', () => {
        cy.visit('/login')

        // กรอกข้อมูล admin
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')

        // คลิกเข้าสู่ระบบ
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบว่า login สำเร็จ
        cy.url({ timeout: 10000 }).should('not.include', '/login')
        cy.contains('เข้าสู่ระบบสำเร็จ', { timeout: 5000 }).should('be.visible')
    })

    it('should show admin menu after login', () => {
        // Login เป็น admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ redirect เสร็จ
        cy.url({ timeout: 10000 }).should('not.include', '/login')

        // ตรวจสอบว่ามีเมนู Admin ใน navbar
        cy.get('nav').contains('Admin Dashboard', { timeout: 5000 }).should('be.visible')
    })

    it('should access admin dashboard after login', () => {
        // Login เป็น admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ login เสร็จ
        cy.url({ timeout: 10000 }).should('not.include', '/login')

        // เข้าหน้า admin dashboard
        cy.visit('/admin')
        cy.url().should('include', '/admin')
        cy.contains('Admin Dashboard').should('be.visible')
    })

    it('should show wrong password error', () => {
        cy.visit('/login')

        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('wrongpassword')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ error message
        cy.contains('รหัสผ่านไม่ถูกต้อง', { timeout: 10000 }).should('be.visible')
    })

    it('should maintain session across page navigation', () => {
        // Login เป็น admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ login เสร็จ
        cy.url({ timeout: 10000 }).should('not.include', '/login')

        // Navigate ไปหน้าต่างๆ
        cy.visit('/')
        cy.get('nav').contains('Admin Dashboard').should('be.visible')

        cy.visit('/admin')
        cy.contains('Admin Dashboard').should('be.visible')

        cy.visit('/admin/payments')
        cy.contains('ตรวจสอบการชำระเงิน').should('be.visible')
    })

    it('should logout successfully', () => {
        // Login เป็น admin
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('testadmin')
        cy.get('input[type="password"]').type('admin123')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ login เสร็จ
        cy.url({ timeout: 10000 }).should('not.include', '/login')

        // คลิก logout
        cy.get('button').contains('ออกจากระบบ').click()

        // ตรวจสอบว่า redirect ไป login
        cy.url({ timeout: 10000 }).should('include', '/login')

        // ตรวจสอบว่าไม่มีเมนู admin แล้ว
        cy.visit('/')
        cy.get('nav').should('not.contain', 'Admin Dashboard')
    })
})