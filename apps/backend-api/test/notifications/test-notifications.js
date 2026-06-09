const axios = require('axios');
const path = require('path');

const configPath = path.join(__dirname, '..', 'test-config.js');
let config;
try {
    config = require(configPath);
} catch (error) {
    console.warn('⚠️ test-config.js not found, using defaults');
    config = {
        baseURL: 'http://localhost:3000',
        testData: {
            testEmail: 'test@example.com',
            testPhone: '+1234567890'
        }
    };
}

class NotificationTester {
    constructor() {
        this.api = axios.create({ baseURL: config.baseURL });
    }

    async testEmailNotifications() {
        console.log('\n📧 TEST 1: Email Notifications');

        const tests = [{
                name: 'Send OTP Email',
                endpoint: '/api/auth/email-otp/send',
                data: { email: config.testData.testEmail, type: 'login' },
                expectedStatus: 200
            },
            {
                name: 'Invalid Email Format',
                endpoint: '/api/auth/email-otp/send',
                data: { email: 'not-an-email' },
                expectedStatus: 422
            }
        ];

        for (const test of tests) {
            try {
                const response = await this.api.post(test.endpoint, test.data);
                console.log('  ✅ ' + test.name + ': HTTP ' + response.status);
            } catch (error) {
                const status = error.response ? error.response.status : 500;
                if (status === test.expectedStatus) {
                    console.log('  ✅ ' + test.name + ': Rejected with HTTP ' + status);
                } else {
                    console.log('  ❌ ' + test.name + ': Got ' + status + ', expected ' + test.expectedStatus);
                }
            }
        }
    }

    async runAll() {
        console.log('\n═══════════════════════════════════════════');
        console.log('🧪 NOTIFICATION MODULE TESTS');
        console.log('═══════════════════════════════════════════');
        await this.testEmailNotifications();
        console.log('\n✨ Notification tests completed!');
    }
}

module.exports = NotificationTester;