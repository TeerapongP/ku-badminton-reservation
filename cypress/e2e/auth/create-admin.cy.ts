describe('Create Admin Functionality', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearAllCookies()
    })

    it('should display create admin page correctly', () => {
        cy.visit('/create-admin')

        // ตรวจสอบ UI elements
        cy.contains('สร้าง Admin').should('be.visible')
        cy.contains('สร้างบัญชี Admin สำหรับระบบ').should('be.visible')

        // ตรวจสอบ form fields
        cy.get('input[name="username"]').should('be.visible')
        cy.get('input[name="password"]').should('be.visible')
        cy.get('input[name="email"]').should('be.visible')
        cy.get('input[name="first_name"]').should('be.visible')
        cy.get('input[name="last_name"]').should('be.visible')

        // ตรวจสอบข้อมูล login
        cy.contains('ข้อมูลสำหรับ Login:').should('be.visible')
        cy.contains('Admin ใช้ Username login').should('be.visible')
    })

    it('should show validation errors for empty fields', () => {
        cy.visit('/create-admin')

        // คลิกสร้าง admin โดยไม่กรอกข้อมูล
        cy.get('button').contains('สร้าง Admin').click()

        // ตรวจสอบว่า browser validation ทำงาน
        cy.get('input[name="username"]:invalid').should('exist')
    })

    it('should successfully create admin user', () => {
        cy.visit('/create-admin')

        // กรอกข้อมูล admin
        const timestamp = Date.now()
        cy.get('input[name="username"]').type(`admin${timestamp}`)
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type(`admin${timestamp}@test.com`)
        cy.get('input[name="first_name"]').type('Test')
        cy.get('input[name="last_name"]').type('Admin')

        // คลิกสร้าง
        cy.get('button').contains('สร้าง Admin').click()

        // ตรวจสอบความสำเร็จ
        cy.contains('สร้าง Admin สำเร็จ', { timeout: 10000 }).should('be.visible')
        cy.contains('สร้าง Admin สำเร็จ!').should('be.visible')
    })

    it('should prevent creating duplicate admin', () => {
        // สร้าง admin คนแรก
        cy.request({
            method: 'POST',
            url: '/api/admin/create-admin',
            body: {
                username: 'firstadmin',
                password: 'admin123',
                email: 'first@test.com',
                first_name: 'First',
                last_name: 'Admin'
            },
            failOnStatusCode: false
        })

        cy.visit('/create-admin')

        // พยายามสร้าง admin คนที่สอง
        cy.get('input[name="username"]').type('secondadmin')
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type('second@test.com')
        cy.get('input[name="first_name"]').type('Second')
        cy.get('input[name="last_name"]').type('Admin')

        cy.get('button').contains('สร้าง Admin').click()

        // ตรวจสอบ error message
        cy.contains('มี Admin อยู่ในระบบแล้ว', { timeout: 10000 }).should('be.visible')
    })

    it('should show loading state during creation', () => {
        cy.visit('/create-admin')

        cy.get('input[name="username"]').type('loadingtest')
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type('loading@test.com')
        cy.get('input[name="first_name"]').type('Loading')
        cy.get('input[name="last_name"]').type('Test')

        // คลิกและตรวจสอบ loading state
        cy.get('button').contains('สร้าง Admin').click()
        cy.contains('กำลังสร้าง...').should('be.visible')
    })

    it('should validate email format', () => {
        cy.visit('/create-admin')

        cy.get('input[name="username"]').type('emailtest')
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type('invalid-email')
        cy.get('input[name="first_name"]').type('Email')
        cy.get('input[name="last_name"]').type('Test')

        cy.get('button').contains('สร้าง Admin').click()

        // ตรวจสอบ browser validation สำหรับ email
        cy.get('input[name="email"]:invalid').should('exist')
    })

    it('should prevent duplicate username', () => {
        // สร้าง admin ด้วย username เฉพาะ
        const uniqueUsername = `unique${Date.now()}`

        cy.request({
            method: 'POST',
            url: '/api/admin/create-admin',
            body: {
                username: uniqueUsername,
                password: 'admin123',
                email: 'unique@test.com',
                first_name: 'Unique',
                last_name: 'Admin'
            },
            failOnStatusCode: false
        })

        cy.visit('/create-admin')

        // พยายามสร้าง admin ด้วย username เดียวกัน
        cy.get('input[name="username"]').type(uniqueUsername)
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type('duplicate@test.com')
        cy.get('input[name="first_name"]').type('Duplicate')
        cy.get('input[name="last_name"]').type('Admin')

        cy.get('button').contains('สร้าง Admin').click()

        // ตรวจสอบ error message
        cy.contains('Username หรือ Email ซ้ำในระบบ', { timeout: 10000 }).should('be.visible')
    })

    it('should clear form after successful creation', () => {
        cy.visit('/create-admin')

        const timestamp = Date.now()
        cy.get('input[name="username"]').type(`cleartest${timestamp}`)
        cy.get('input[name="password"]').type('admin123')
        cy.get('input[name="email"]').type(`clear${timestamp}@test.com`)
        cy.get('input[name="first_name"]').type('Clear')
        cy.get('input[name="last_name"]').type('Test')

        cy.get('button').contains('สร้าง Admin').click()

        // รอให้สร้างเสร็จ
        cy.contains('สร้าง Admin สำเร็จ', { timeout: 10000 }).should('be.visible')

        // ตรวจสอบว่า form ถูกเคลียร์
        cy.get('input[name="username"]').should('have.value', '')
        cy.get('input[name="password"]').should('have.value', '')
        cy.get('input[name="email"]').should('have.value', '')
    })

    it('should show correct login instructions', () => {
        cy.visit('/create-admin')

        // ตรวจสอบคำแนะนำ login
        cy.contains('Username:').should('be.visible')
        cy.contains('Password: รหัสผ่านที่กรอกด้านบน').should('be.visible')
        cy.contains('Admin ใช้ Username login (ไม่ใช่ National ID)').should('be.visible')

        // ตรวจสอบลิงก์ไป login
        cy.get('a[href="/login"]').contains('Login ด้วย Username').should('be.visible')
    })
})