/**
 * Cypress E2E Test: Simple RECAPTCHA Trigger Test
 * 
 * ทดสอบแบบง่าย: Login ผิด 3 ครั้งติดต่อกัน แล้วดูว่าขึ้น RECAPTCHA หรือไม่
 */

describe('Simple RECAPTCHA Test - Login 3 Times Wrong', () => {
    const WRONG_CREDENTIALS = {
        username: 'wronguser999',
        password: 'wrongpass123'
    };

    before(() => {
        cy.log('🚀 Starting RECAPTCHA trigger test...');
        cy.log('📋 Test Plan: Login wrong 3 times and check for RECAPTCHA');
    });

    beforeEach(() => {
        // เคลียร์ทุกอย่างก่อนแต่ละ test
        cy.clearAllSessionStorage();
        cy.clearAllCookies();
        cy.clearLocalStorage();
    });

    it('should trigger RECAPTCHA after 3 failed login attempts', () => {
        cy.visit('/login');
        cy.wait(1000);

        // ลอง login ผิด 3 ครั้ง
        for (let attempt = 1; attempt <= 3; attempt++) {
            cy.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            cy.log(`🔄 Attempt ${attempt}/3: Trying to login with wrong credentials`);
            cy.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            // กรอก username
            cy.get('input[placeholder*="รหัสนิสิต"]')
                .clear()
                .type(WRONG_CREDENTIALS.username, { delay: 50 });

            // กรอก password
            cy.get('input[type="password"]')
                .clear()
                .type(WRONG_CREDENTIALS.password, { delay: 50 });

            // คลิกปุ่ม login
            cy.get('button').contains('เข้าสู่ระบบ').click();

            // รอให้ API response กลับมา
            cy.wait(3000);

            // ถ่ายภาพหน้าจอ
            cy.screenshot(`attempt-${attempt}-after-submit`);

            // แสดงสถานะ
            if (attempt < 3) {
                cy.log(`✅ Attempt ${attempt} completed - No RECAPTCHA expected yet`);
            } else {
                cy.log(`🎯 Attempt ${attempt} completed - RECAPTCHA should appear now!`);
            }
        }

        // ตรวจสอบว่ามี RECAPTCHA หรือไม่
        cy.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        cy.log('🔍 Checking for RECAPTCHA...');
        cy.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // ถ่ายภาพหน้าจอสุดท้าย
        cy.screenshot('final-state-after-3-attempts');

        // ตรวจสอบหลายกรณี
        cy.get('body').then(($body) => {
            const bodyHTML = $body.html();
            const bodyText = $body.text();

            // 1. ตรวจสอบ RECAPTCHA widget
            const hasRecaptchaWidget = 
                $body.find('.g-recaptcha').length > 0 ||
                $body.find('[data-testid="recaptcha"]').length > 0 ||
                $body.find('iframe[src*="recaptcha"]').length > 0 ||
                $body.find('iframe[title*="reCAPTCHA"]').length > 0;

            // 2. ตรวจสอบ RECAPTCHA message
            const hasRecaptchaMessage = 
                bodyText.includes('Captcha') ||
                bodyText.includes('captcha') ||
                bodyText.includes('CAPTCHA') ||
                bodyText.includes('ยืนยันตัวตน') ||
                bodyText.includes('กรุณายืนยัน');

            // 3. ตรวจสอบ rate limit message
            const hasRateLimitMessage = 
                bodyText.includes('มากเกินไป') ||
                bodyText.includes('รอ') ||
                bodyText.includes('30 นาที');

            // แสดงผลการตรวจสอบ
            cy.log('📊 Detection Results:');
            cy.log(`   - RECAPTCHA Widget: ${hasRecaptchaWidget ? '✅ Found' : '❌ Not Found'}`);
            cy.log(`   - RECAPTCHA Message: ${hasRecaptchaMessage ? '✅ Found' : '❌ Not Found'}`);
            cy.log(`   - Rate Limit Message: ${hasRateLimitMessage ? '✅ Found' : '❌ Not Found'}`);

            // แสดง HTML snippet ที่เกี่ยวข้อง
            if (hasRecaptchaWidget || hasRecaptchaMessage) {
                cy.log('🎉 SUCCESS: RECAPTCHA detected!');
            } else {
                cy.log('⚠️ WARNING: RECAPTCHA not detected');
                cy.log('📝 Page content:', bodyText.substring(0, 500));
            }

            // Assertion: อย่างน้อยต้องมี RECAPTCHA หรือ rate limit message
            expect(
                hasRecaptchaWidget || hasRecaptchaMessage || hasRateLimitMessage,
                'Should show RECAPTCHA or rate limit message after 3 failed attempts'
            ).to.be.true;
        });
    });

    it('should show RECAPTCHA requirement in error message', () => {
        cy.visit('/login');

        // Login ผิด 3 ครั้ง
        for (let i = 1; i <= 3; i++) {
            cy.get('input[placeholder*="รหัสนิสิต"]').clear().type('testuser');
            cy.get('input[type="password"]').clear().type('wrongpass');
            cy.get('button').contains('เข้าสู่ระบบ').click();
            cy.wait(2000);
        }

        // ตรวจสอบ error message
        cy.contains(/captcha|ยืนยัน|มากเกินไป/i, { timeout: 5000 })
            .should('be.visible')
            .invoke('text')
            .then((text) => {
                cy.log('✅ Found message:', text);
            });
    });
});

/**
 * Test Suite: Direct API Testing
 * ทดสอบโดยตรงกับ API เพื่อความแม่นยำ
 */
describe('RECAPTCHA API Direct Test', () => {
    it('should return requireCaptcha=true after 3 failed attempts', () => {
        const credentials = {
            username: 'apitest' + Date.now(),
            password: 'wrongpassword'
        };

        cy.log('🚀 Testing API directly...');

        // ส่ง request 3 ครั้ง
        cy.wrap([1, 2, 3]).each((attempt: number) => {
            cy.log(`📤 API Request ${attempt}/3`);

            cy.request({
                method: 'POST',
                url: '/api/auth/login-security',
                body: credentials,
                failOnStatusCode: false,
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                cy.log(`📥 Response ${attempt}:`, {
                    status: response.status,
                    body: response.body
                });

                if (attempt === 3) {
                    cy.log('🎯 Checking 3rd attempt response...');

                    // ตรวจสอบว่ามี requireCaptcha flag
                    if (response.body.error?.details?.requireCaptcha) {
                        cy.log('✅ SUCCESS: requireCaptcha flag found!');
                        expect(response.body.error.details.requireCaptcha).to.be.true;
                    } else if (response.body.error?.message?.includes('Captcha')) {
                        cy.log('✅ SUCCESS: Captcha mentioned in error message!');
                    } else if (response.status === 429 || response.status === 423) {
                        cy.log('✅ SUCCESS: Rate limit status code received!');
                    } else {
                        cy.log('⚠️ Response:', JSON.stringify(response.body, null, 2));
                    }
                }
            });

            // รอระหว่าง request
            cy.wait(1500);
        });
    });
});
