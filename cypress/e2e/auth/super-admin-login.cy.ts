describe('Super Admin Login', () => {
    beforeEach(() => {
        // เคลียร์ session ก่อนทดสอบแต่ละครั้ง
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should login successfully with superAdmin credentials', () => {
        cy.visit('/login')

        // กรอกข้อมูล superAdmin
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('input[type="password"]').type('1234567890')

        // คลิกปุ่มเข้าสู่ระบบ
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ loading state
        cy.contains('กำลังเข้าสู่ระบบ...').should('be.visible')

        // ตรวจสอบว่า login สำเร็จและ redirect
        cy.url({ timeout: 15000 }).should('not.include', '/login')
        
        // ตรวจสอบว่าเข้าสู่หน้า admin dashboard
        cy.url().should('match', /\/(admin|dashboard|$)/)
        
        // ตรวจสอบว่ามี navigation หรือ menu ของ admin
        cy.get('body').should('contain.text', 'Admin')
            .or('contain.text', 'ผู้ดูแลระบบ')
            .or('contain.text', 'Dashboard')
    })

    it('should show error for superAdmin with wrong password', () => {
        cy.visit('/login')

        // กรอกข้อมูล superAdmin ด้วยรหัสผ่านผิด
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('input[type="password"]').type('wrongpassword')

        // คลิกปุ่มเข้าสู่ระบบ
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ error message
        cy.contains('รหัสผ่านไม่ถูกต้อง', { timeout: 10000 }).should('be.visible')
        
        // ตรวจสอบว่ายังอยู่ในหน้า login
        cy.url().should('include', '/login')
    })

    it('should show error for wrong superAdmin username', () => {
        cy.visit('/login')

        // กรอกข้อมูล username ผิด
        cy.get('input[placeholder*="รหัสนิสิต"]').type('wrongAdmin')
        cy.get('input[type="password"]').type('1234567890')

        // คลิกปุ่มเข้าสู่ระบบ
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ error message
        cy.contains('ไม่พบผู้ใช้ในระบบ', { timeout: 10000 }).should('be.visible')
        
        // ตรวจสอบว่ายังอยู่ในหน้า login
        cy.url().should('include', '/login')
    })

    it('should handle empty fields validation', () => {
        cy.visit('/login')

        // ทดสอบกรอกเฉพาะ username
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('กรุณากรอกรหัสผ่าน').should('be.visible')

        // เคลียร์และทดสอบกรอกเฉพาะ password
        cy.get('input[placeholder*="รหัสนิสิต"]').clear()
        cy.get('input[type="password"]').type('1234567890')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('กรุณากรอกรหัสนิสิต').should('be.visible')
    })

    it('should maintain session after successful login', () => {
        cy.visit('/login')

        // Login
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('input[type="password"]').type('1234567890')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ login สำเร็จ
        cy.url({ timeout: 15000 }).should('not.include', '/login')

        // ทดสอบ refresh หน้า
        cy.reload()
        
        // ตรวจสอบว่ายังคง login อยู่
        cy.url().should('not.include', '/login')
    })

    it('should logout successfully', () => {
        // Login ก่อน
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type('superAdmin')
        cy.get('input[type="password"]').type('1234567890')
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.url({ timeout: 15000 }).should('not.include', '/login')

        // หา logout button และคลิก
        cy.get('body').then(($body) => {
            if ($body.text().includes('ออกจากระบบ')) {
                cy.contains('ออกจากระบบ').click()
            } else if ($body.text().includes('Logout')) {
                cy.contains('Logout').click()
            } else {
                // หาจาก menu หรือ dropdown
                cy.get('[data-testid="user-menu"]').click()
                cy.contains('ออกจากระบบ').click()
            }
        })

        // ตรวจสอบว่า redirect กลับไปหน้า login
        cy.url({ timeout: 10000 }).should('include', '/login')
    })
})