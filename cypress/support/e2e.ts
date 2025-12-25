// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

/// <reference types="cypress" />
/// <reference path="./index.d.ts" />

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log (optional)
Cypress.on('window:before:load', (win) => {
    // Disable service workers
    if (win.navigator && win.navigator.serviceWorker) {
        delete (win.navigator as any).serviceWorker
    }
})

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
    // Returning false here prevents Cypress from failing the test
    // on uncaught exceptions. Use carefully!
    
    // Ignore specific errors that might occur during testing
    if (err.message.includes('ResizeObserver loop limit exceeded')) {
        return false
    }
    
    if (err.message.includes('Non-Error promise rejection captured')) {
        return false
    }
    
    // Let other errors fail the test
    return true
})

// Custom commands for better test organization
beforeEach(() => {
    // Clear any previous state
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
})

// Add custom assertions
chai.use((chai, utils) => {
    chai.Assertion.addMethod('beVisibleAndContain', function (text) {
        const obj = this._obj
        
        new chai.Assertion(obj).to.be.visible
        new chai.Assertion(obj).to.contain(text)
    })
})

// Global test configuration
Cypress.config('defaultCommandTimeout', 10000)
Cypress.config('requestTimeout', 10000)
Cypress.config('responseTimeout', 10000)

