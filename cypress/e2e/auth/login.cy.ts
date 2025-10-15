describe('Login Authentication', () => {
    beforeEach(() => {
        // เคลียร์ session ก่อนทดสอบแต่ละครั้ง
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should display login page correctly', () => {
        cy.visit('/login')

        // ตรวจสอบ UI elements
        cy.contains('เข้าสู่ระบบ').should('be.visible')
        cy.get('input[placeholder*="รหัสนิสิต"]').should('be.visible')
        cy.get('input[type="password"]').should('be.visible')
        cy.contains('ลืมรหัสผ่าน?').should('be.visible')
        cy.contains('ลงทะเบียน').should('be.visible')

        // ตรวจสอบคำแนะนำ
        cy.contains('นิสิต: รหัสนิสิต 8-10 หลัก').should('be.visible')
        cy.contains('บุคลากร: เลขบัตรประชาชน 13 หลัก').should('be.visible')
        cy.contains('Admin: Username').should('be.visible')
    })

    it('should show validation errors for empty fields', () => {
        cy.visit('/login')

        // คลิกปุ่มเข้าสู่ระบบโดยไม่กรอกข้อมูล
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ error message
        cy.contains('กรุณากรอกรหัสนิสิต, เลขบัตรประชาชน หรือ Username').should('be.visible')
    })

    it('should show validation error for invalid format', () => {
        cy.visit('/login')

        // กรอกข้อมูลที่ไม่ถูกรูปแบบ
        cy.get('input[placeholder*="รหัสนิสิต"]').type('invalid123')
        cy.get('input[type="password"]').type('password')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // ตรวจสอบ error message
        cy.contains('รหัสนิสิตต้องเป็นตัวเลข 8-10 หลัก').should('be.visible')
    })

    it('should show error for non-existent user', () => {
        cy.visit('/login')

        // กรอกรหัสนิสิตที่ไม่มีในระบบ
        cy.get('input[placeholder*="รหัสนิสิต"]').type('99999999')
        cy.get('input[type="password"]').type('wrongpassword')
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ API response กลับมา
        cy.contains('ไม่พบผู้ใช้ในระบบ', { timeout: 10000 }).should('be.visible')
    })

    it('should accept valid student ID format', () => {
        cy.visit('/login')

        // ทดสอบรหัสนิสิต 8 หลัก
        cy.get('input[placeholder*="รหัสนิสิต"]').clear().type('65123456')
        cy.get('input[type="password"]').type('password')

        // ไม่ควรมี validation error
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('รหัสนิสิตต้องเป็นตัวเลข').should('not.exist')
    })

    it('should accept valid national ID format', () => {
        cy.visit('/login')

        // ทดสอบเลขบัตรประชาชน 13 หลัก
        cy.get('input[placeholder*="รหัสนิสิต"]').clear().type('1234567890123')
        cy.get('input[type="password"]').type('password')

        // ไม่ควรมี validation error
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('รหัสนิสิตต้องเป็นตัวเลข').should('not.exist')
    })

    it('should accept valid username format for admin', () => {
        cy.visit('/login')

        // ทดสอบ username
        cy.get('input[placeholder*="รหัสนิสิต"]').clear().type('admin')
        cy.get('input[type="password"]').type('password')

        // ไม่ควรมี validation error
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('รหัสนิสิตต้องเป็นตัวเลข').should('not.exist')
    })

    it('should show loading state during login', () => {
        cy.visit('/login')

        cy.get('input[placeholder*="รหัสนิสิต"]').type('admin')
        cy.get('input[type="password"]').type('password')

        // คลิกและตรวจสอบ loading state
        cy.get('button').contains('เข้าสู่ระบบ').click()
        cy.contains('กำลังเข้าสู่ระบบ...').should('be.visible')
    })

    it('should redirect to forgot password page', () => {
        cy.visit('/login')

        cy.contains('ลืมรหัสผ่าน?').click()
        cy.url().should('include', '/forgot-password')
    })

    it('should redirect to register page', () => {
        cy.visit('/login')

        cy.contains('ลงทะเบียน').click()
        cy.url().should('include', '/register')
    })

    it('should handle maxLength correctly', () => {
        cy.visit('/login')

        // ทดสอบว่า input จำกัดความยาวที่ 20 ตัวอักษร
        const longText = 'a'.repeat(25)
        cy.get('input[placeholder*="รหัสนิสิต"]').type(longText)
        cy.get('input[placeholder*="รหัสนิสิต"]').should('have.value', 'a'.repeat(20))
    })
})