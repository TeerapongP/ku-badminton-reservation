/// <reference types="cypress" />
/// <reference path="./index.d.ts" />

// Custom command สำหรับ login เป็น admin
Cypress.Commands.add('loginAsAdmin', (username = 'testadmin', password = 'admin123') => {
    cy.session([username, password], () => {
        // สร้าง admin user ก่อน (ถ้ายังไม่มี)
        cy.request({
            method: 'POST',
            url: '/api/admin/create-admin',
            body: {
                username: username,
                password: password,
                email: `${username}@test.com`,
                first_name: 'Test',
                last_name: 'Admin'
            },
            failOnStatusCode: false
        })

        // Login
        cy.visit('/login')
        cy.get('input[placeholder*="รหัสนิสิต"]').type(username)
        cy.get('input[type="password"]').type(password)
        cy.get('button').contains('เข้าสู่ระบบ').click()

        // รอให้ login สำเร็จ
        cy.url({ timeout: 15000 }).should('not.include', '/login')
    })
})

// Custom command สำหรับสร้าง test admin
Cypress.Commands.add('createTestAdmin', (username = 'testadmin', password = 'admin123') => {
    cy.request({
        method: 'POST',
        url: '/api/admin/create-admin',
        body: {
            username: username,
            password: password,
            email: `${username}@test.com`,
            first_name: 'Test',
            last_name: 'Admin'
        },
        failOnStatusCode: false
    }).then((response) => {
        // Log ผลลัพธ์เพื่อ debug
        cy.log(`Create admin response: ${response.status}`)
        if (response.body && response.body.message) {
            cy.log(`Message: ${response.body.message}`)
        }
    })
})

// Custom command สำหรับ cleanup admin users
Cypress.Commands.add('cleanupAdmins', () => {
    // ใน production จริงไม่ควรมี endpoint นี้
    // แต่สำหรับ testing สามารถสร้าง endpoint พิเศษได้
    cy.log('Cleaning up test admin users')
})

// Custom command สำหรับตรวจสอบ admin access
Cypress.Commands.add('verifyAdminAccess', () => {
    cy.visit('/admin')
    cy.url().should('include', '/admin')
    cy.contains('Admin Dashboard').should('be.visible')
})

// Custom command สำหรับตรวจสอบว่าไม่มีสิทธิ์ admin
Cypress.Commands.add('verifyNoAdminAccess', () => {
    cy.visit('/admin')
    cy.url().should('include', '/login')
})

// Custom command สำหรับ logout
Cypress.Commands.add('logoutUser', () => {
    cy.visit('/')
    cy.get('button').contains('ออกจากระบบ').click()
    cy.url({ timeout: 10000 }).should('include', '/login')
})

