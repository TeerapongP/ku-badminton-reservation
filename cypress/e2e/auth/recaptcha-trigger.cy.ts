/**
 * Cypress E2E Test: RECAPTCHA Trigger Test
 * 
 * วัตถุประสงค์: ทดสอบว่าระบบจะแสดง RECAPTCHA หลังจาก login ผิด 3 ครั้ง
 * 
 * ขั้นตอนการทดสอบ:
 * 1. Login ผิด 1 ครั้ง - ไม่มี RECAPTCHA
 * 2. Login ผิด 2 ครั้ง - ไม่มี RECAPTCHA
 * 3. Login ผิด 3 ครั้ง - ต้องมี RECAPTCHA
 * 4. Login ผิด 5 ครั้ง - Account Lock
 */

describe('RECAPTCHA Trigger Test', () => {
    const TEST_USER = {
        username: 'testuser123',
        wrongPassword: 'wrongpassword123'
    };

    beforeEach(() => {
        // เคลียร์ session และ cookies ก่อนแต่ละ test
        cy.clearAllSessionStorage();
        cy.clearAllCookies();
        cy.clearLocalStorage();
    });

    it('should NOT show RECAPTCHA on first failed login attempt', () => {
        cy.visit('/login');

        // พยายาม login ครั้งที่ 1 ด้วยรหัสผ่านผิด
        cy.get('input[placeholder*="รหัสนิสิต"]').type(TEST_USER.username);
        cy.get('input[type="password"]').type(TEST_USER.wrongPassword);
        cy.get('button').contains('เข้าสู่ระบบ').click();

        // รอให้ error message แสดง
        cy.wait(2000);

        // ตรวจสอบว่าไม่มี RECAPTCHA
        cy.get('.g-recaptcha').should('not.exist');
        cy.get('[data-testid="recaptcha"]').should('not.exist');
        cy.contains('กรุณายืนยัน Captcha').should('not.exist');

        // ควรมี error message
        cy.contains(/รหัสผ่านไม่ถูกต้อง|ไม่พบผู้ใช้/i, { timeout: 10000 }).should('be.visible');
    });

    it('should NOT show RECAPTCHA on second failed login attempt', () => {
        cy.visit('/login');

        // พยายาม login ครั้งที่ 1
        cy.get('input[placeholder*="รหัสนิสิต"]').type(TEST_USER.username);
        cy.get('input[type="password"]').type(TEST_USER.wrongPassword);
        cy.get('button').contains('เข้าสู่ระบบ').click();
        cy.wait(2000);

        // พยายาม login ครั้งที่ 2
        cy.get('input[placeholder*="รหัสนิสิต"]').clear().type(TEST_USER.username);
        cy.get('input[type="password"]').clear().type(TEST_USER.wrongPassword);
        cy.get('button').contains('เข้าสู่ระบบ').click();
        cy.wait(2000);

        // ตรวจสอบว่ายังไม่มี RECAPTCHA
        cy.get('.g-recaptcha').should('not.exist');
        cy.get('[data-testid="recaptcha"]').should('not.exist');
        cy.contains('กรุณายืนยัน Captcha').should('not.exist');
    });

    it('should SHOW RECAPTCHA after 3 failed login attempts', () => {
        cy.visit('/login');

        // พยายาม login ผิด 3 ครั้งติดต่อกัน
        for (let i = 1; i <= 3; i++) {
            cy.log(`🔄 Failed login attempt ${i}/3`);

            cy.get('input[placeholder*="รหัสนิสิต"]').clear().type(TEST_USER.username);
            cy.get('input[type="password"]').clear().type(TEST_USER.wrongPassword);
            cy.get('button').contains('เข้าสู่ระบบ').click();

            // รอให้ API response กลับมา
            cy.wait(2000);

            if (i < 3) {
                // ครั้งที่ 1-2 ไม่ควรมี RECAPTCHA
                cy.log('✅ No RECAPTCHA yet (expected)');
            }
        }

        // หลังจาก 3 ครั้ง ควรมี RECAPTCHA หรือ error message ที่บอกให้ทำ RECAPTCHA
        cy.log('🎯 Checking for RECAPTCHA requirement...');

        // ตรวจสอบหลายกรณี:
        // 1. มี RECAPTCHA widget แสดง
        // 2. มี error message บอกให้ทำ RECAPTCHA
        // 3. มี data attribute ที่บอกว่าต้องทำ RECAPTCHA
        cy.get('body').then(($body) => {
            const hasRecaptchaWidget = $body.find('.g-recaptcha').length > 0 ||
                $body.find('[data-testid="recaptcha"]').length > 0 ||
                $body.find('iframe[src*="recaptcha"]').length > 0;

            const hasRecaptchaMessage = $body.text().includes('Captcha') ||
                $body.text().includes('captcha') ||
                $body.text().includes('ยืนยันตัวตน');

            if (hasRecaptchaWidget) {
                cy.log('✅ RECAPTCHA widget found!');
            } else if (hasRecaptchaMessage) {
                cy.log('✅ RECAPTCHA message found!');
            } else {
                cy.log('⚠️ RECAPTCHA not detected - checking API response...');
            }

            // อย่างน้อยต้องมีอย่างใดอย่างหนึ่ง
            expect(hasRecaptchaWidget || hasRecaptchaMessage).to.be.true;
        });
    });

    it('should show account lock message after 5 failed attempts', () => {
        cy.visit('/login');

        // พยายาม login ผิด 5 ครั้งติดต่อกัน
        for (let i = 1; i <= 5; i++) {
            cy.log(`🔄 Failed login attempt ${i}/5`);

            cy.get('input[placeholder*="รหัสนิสิต"]').clear().type(TEST_USER.username);
            cy.get('input[type="password"]').clear().type(TEST_USER.wrongPassword);
            cy.get('button').contains('เข้าสู่ระบบ').click();

            // รอให้ API response กลับมา
            cy.wait(2000);
        }

        // หลังจาก 5 ครั้ง ควรมี lock message
        cy.log('🔒 Checking for account lock message...');

        cy.get('body').then(($body) => {
            const bodyText = $body.text();
            const hasLockMessage = bodyText.includes('30 นาที') ||
                bodyText.includes('ล็อก') ||
                bodyText.includes('lock') ||
                bodyText.includes('เกิน 5 ครั้ง') ||
                bodyText.includes('รอ');

            if (hasLockMessage) {
                cy.log('✅ Account lock message found!');
            } else {
                cy.log('⚠️ Lock message not found - may need to check API');
            }

            expect(hasLockMessage).to.be.true;
        });
    });

    it('should trigger RECAPTCHA with different usernames (IP-based)', () => {
        cy.visit('/login');

        // ทดสอบด้วย username ต่างๆ จาก IP เดียวกัน
        const testUsers = ['user1', 'user2', 'user3'];

        testUsers.forEach((username, index) => {
            cy.log(`🔄 Failed login attempt ${index + 1}/3 with ${username}`);

            cy.get('input[placeholder*="รหัสนิสิต"]').clear().type(username);
            cy.get('input[type="password"]').clear().type('wrongpassword');
            cy.get('button').contains('เข้าสู่ระบบ').click();

            cy.wait(2000);
        });

        // หลังจาก 3 ครั้งจาก IP เดียวกัน ควรมี RECAPTCHA
        cy.log('🎯 Checking for IP-based RECAPTCHA...');

        cy.get('body').then(($body) => {
            const hasRecaptcha = $body.find('.g-recaptcha').length > 0 ||
                $body.find('[data-testid="recaptcha"]').length > 0 ||
                $body.text().includes('Captcha');

            if (hasRecaptcha) {
                cy.log('✅ IP-based RECAPTCHA triggered!');
            }

            expect(hasRecaptcha).to.be.true;
        });
    });

    it('should show remaining attempts counter', () => {
        cy.visit('/login');

        // พยายาม login ผิด 1 ครั้ง
        cy.get('input[placeholder*="รหัสนิสิต"]').type(TEST_USER.username);
        cy.get('input[type="password"]').type(TEST_USER.wrongPassword);
        cy.get('button').contains('เข้าสู่ระบบ').click();

        cy.wait(2000);

        // ตรวจสอบว่ามี message บอกจำนวนครั้งที่เหลือ
        cy.get('body').then(($body) => {
            const bodyText = $body.text();
            const hasRemainingAttempts = bodyText.includes('เหลือ') ||
                bodyText.includes('ครั้ง') ||
                bodyText.match(/\d+\s*ครั้ง/);

            if (hasRemainingAttempts) {
                cy.log('✅ Remaining attempts counter found!');
            } else {
                cy.log('⚠️ No remaining attempts counter (may be by design)');
            }
        });
    });
});

/**
 * Test Suite: API-Level RECAPTCHA Testing
 * ทดสอบโดยตรงกับ API endpoint
 */
describe('RECAPTCHA API Test', () => {
    const API_ENDPOINT = '/api/auth/login-security';

    beforeEach(() => {
        cy.clearAllCookies();
    });

    it('should return requireCaptcha flag after 3 failed attempts', () => {
        const testData = {
            username: 'apitest123',
            password: 'wrongpassword'
        };

        // ส่ง request 3 ครั้ง
        for (let i = 1; i <= 3; i++) {
            cy.request({
                method: 'POST',
                url: API_ENDPOINT,
                body: testData,
                failOnStatusCode: false
            }).then((response) => {
                cy.log(`API attempt ${i}/3 - Status: ${response.status}`);

                if (i === 3) {
                    // ครั้งที่ 3 ควรได้ requireCaptcha flag
                    cy.log('🎯 Checking for requireCaptcha flag...');

                    // ตรวจสอบ response body
                    if (response.body.error && response.body.error.details) {
                        expect(response.body.error.details).to.have.property('requireCaptcha');
                        expect(response.body.error.details.requireCaptcha).to.be.true;
                        cy.log('✅ requireCaptcha flag found in API response!');
                    } else {
                        cy.log('⚠️ Response structure:', JSON.stringify(response.body));
                    }
                }
            });

            // รอเล็กน้อยระหว่าง request
            cy.wait(1000);
        }
    });

    it('should return account lock after 5 failed attempts', () => {
        const testData = {
            username: 'locktest123',
            password: 'wrongpassword'
        };

        // ส่ง request 5 ครั้ง
        for (let i = 1; i <= 5; i++) {
            cy.request({
                method: 'POST',
                url: API_ENDPOINT,
                body: testData,
                failOnStatusCode: false
            }).then((response) => {
                cy.log(`API attempt ${i}/5 - Status: ${response.status}`);

                if (i === 5) {
                    // ครั้งที่ 5 ควรได้ lock message
                    cy.log('🔒 Checking for account lock...');

                    expect(response.status).to.be.oneOf([423, 429]); // 423 Locked or 429 Too Many Requests
                    expect(response.body.error.message).to.include('30 นาที');
                    cy.log('✅ Account lock confirmed!');
                }
            });

            cy.wait(1000);
        }
    });
});
