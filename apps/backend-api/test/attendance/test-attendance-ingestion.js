const axios = require('axios');
const path = require('path');

// Adjust path to find test-config
const configPath = path.join(__dirname, '..', 'test-config.js');
let config;
try {
    config = require(configPath);
} catch (error) {
    console.warn('⚠️ test-config.js not found, using defaults');
    config = {
        baseURL: 'http://localhost:3000'
    };
}

class AttendanceIngestionTester {
    constructor() {
        this.api = axios.create({ baseURL: config.baseURL });
    }

    async testAPIEndpointIngestion() {
        console.log('\n📡 TEST 1: API Endpoint Ingestion');

        const testCases = [{
                name: 'Valid attendance record',
                data: {
                    user_id: 'EMP001',
                    timestamp: '2026-06-08 09:00:00',
                    status: 'IN',
                    device_id: 'DEVICE_01'
                },
                expectedStatus: 200
            },
            {
                name: 'Missing required field',
                data: {
                    user_id: 'EMP001',
                    status: 'IN'
                },
                expectedStatus: 400
            },
            {
                name: 'Invalid status value',
                data: {
                    user_id: 'EMP001',
                    timestamp: '2026-06-08 09:00:00',
                    status: 'UNKNOWN',
                    device_id: 'DEVICE_01'
                },
                expectedStatus: 422
            }
        ];

        for (const test of testCases) {
            try {
                const response = await this.api.post('/api/attendance/ingest', test.data);
                if (response.status === test.expectedStatus) {
                    console.log('  ✅ ' + test.name + ': HTTP ' + response.status);
                } else {
                    console.log('  ⚠️ ' + test.name + ': Got ' + response.status + ', expected ' + test.expectedStatus);
                }
            } catch (error) {
                const status = error.response ? error.response.status : 500;
                if (status === test.expectedStatus) {
                    console.log('  ✅ ' + test.name + ': Rejected with HTTP ' + status + ' (expected)');
                } else {
                    console.log('  ❌ ' + test.name + ': Got ' + status + ', expected ' + test.expectedStatus);
                }
            }
        }
    }

    async testDeviceSimulation() {
        console.log('\n🖥️ TEST 2: Device Simulation');

        const records = [];
        for (let i = 0; i < 5; i++) {
            records.push({
                user_id: 'EMP' + String(i).padStart(3, '0'),
                timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                status: i % 2 === 0 ? 'IN' : 'OUT',
                device_id: 'SIM_DEVICE'
            });
        }

        let successCount = 0;
        for (const record of records) {
            try {
                await this.api.post('/api/attendance/ingest', record);
                successCount++;
            } catch (error) {
                console.log('     ⚠️ Failed: ' + record.user_id);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('  ✅ Sent ' + successCount + '/' + records.length + ' records');
    }

    async runAll() {
        console.log('\n═══════════════════════════════════════════');
        console.log('🧪 ATTENDANCE MODULE TESTS');
        console.log('═══════════════════════════════════════════');
        await this.testAPIEndpointIngestion();
        await this.testDeviceSimulation();
        console.log('\n✨ Attendance tests completed!');
    }
}

module.exports = AttendanceIngestionTester;