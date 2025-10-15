/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable<Subject = any> {
        /**
         * Login as admin user
         * @param username - Admin username (default: 'testadmin')
         * @param password - Admin password (default: 'admin123')
         */
        loginAsAdmin(username?: string, password?: string): Chainable<void>

        /**
         * Create a test admin user
         * @param username - Admin username (default: 'testadmin')
         * @param password - Admin password (default: 'admin123')
         */
        createTestAdmin(username?: string, password?: string): Chainable<void>

        /**
         * Cleanup admin users (for testing)
         */
        cleanupAdmins(): Chainable<void>

        /**
         * Verify that current user has admin access
         */
        verifyAdminAccess(): Chainable<void>

        /**
         * Verify that current user does not have admin access
         */
        verifyNoAdminAccess(): Chainable<void>

        /**
         * Logout current user
         */
        logoutUser(): Chainable<void>

        /**
         * Custom assertion: element should be visible and contain text
         * @param text - Text that element should contain
         */
        beVisibleAndContain(text: string): Chainable<Element>
    }
}