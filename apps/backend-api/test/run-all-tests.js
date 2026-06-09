#!/usr/bin/env node

// Fixed: Changed './websocket/test-websockets' to './websocket/test-websocket'
const AttendanceIngestionTester = require("./attendance/test-attendance-ingestion");
const NotificationTester = require("./notifications/test-notifications");
const WebSocketTester = require("./websocket/test-websocket"); // Note: 'websocket' not 'websockets'

async function runAllTests() {
    console.log("═══════════════════════════════════════════");
    console.log("🧪 COMPREHENSIVE MODULE TESTING SUITE");
    console.log("═══════════════════════════════════════════");

    const startTime = Date.now();

    // Create testers
    const attendanceTester = new AttendanceIngestionTester();
    const notificationTester = new NotificationTester();
    const wsTester = new WebSocketTester();

    // Run all tests
    try {
        await attendanceTester.runAll();
    } catch (error) {
        console.error("❌ Attendance tests failed:", error.message);
    }

    try {
        await notificationTester.runAll();
    } catch (error) {
        console.error("❌ Notification tests failed:", error.message);
    }

    try {
        await wsTester.runAll();
    } catch (error) {
        console.error("❌ WebSocket tests failed:", error.message);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log("\n═══════════════════════════════════════════");
    console.log("✅ All tests completed in " + duration + " seconds");
    console.log("═══════════════════════════════════════════");
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };