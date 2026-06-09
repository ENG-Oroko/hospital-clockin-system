// Test Configuration File
module.exports = {
    // API Base URL (change to your actual server)
    baseURL: 'http://localhost:3000', // Change to your backend port

    // WebSocket URL (change to your actual WebSocket server)
    wsURL: 'ws://localhost:3000', // Change to your backend port

    // Database connection (optional - for verification)
    dbConnection: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'attendance_test'
    },

    // Test Data
    testData: {
        validUser: { id: 'EMP001', name: 'Test Employee' },
        invalidUser: { id: 'INVALID', name: '' },
        testEmail: 'test@example.com',
        testPhone: '+1234567890'
    },

    // Test timeouts (milliseconds)
    timeouts: {
        connection: 5000,
        response: 10000,
        websocket: 5000
    }
};