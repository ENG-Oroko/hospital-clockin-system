// Location: packages/database/prisma/seed.ts
import { db as prisma } from '../src/client'; // 🛡️ Link to the hot-reload protected singleton

async function main() {
  console.log('🚀 Starting system data seeding loop...');

  // ==========================================
  // MODULE 1: TENANT DEPLOYMENT
  // ==========================================
  console.log('🏢 Seeding Tenant Layer...');
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'st-teresa' },
    update: {},
    create: {
      name: 'St. Teresa Referral Hospital',
      subdomain: 'st-teresa',
      licenseKey: 'CHRONOS-L4-STTERESA-99281-X',
      isActive: true,
    },
  });

  // ==========================================
  // MODULE 2: SYSTEM SETTINGS (GLOBAL RULES)
  // ==========================================
  console.log('⚙️  Seeding Global System Settings...');
  await prisma.systemSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      attendanceRules: {
        halfDayLateMinutes: 60,
        absenteeismThresholdHours: 4.0,
        maximumShiftLengthHours: 16,
      },
      holidayCalendar: {
        observedHolidays: [
          { name: 'Madaraka Day', date: '2026-06-01' },
          { name: 'Mashujaa Day', date: '2026-10-20' },
          { name: 'Jamhuri Day', date: '2026-12-12' },
        ],
      },
      salaryRules: {
        shifRate: 0.0275,        // 2.75% Social Health Insurance Fund
        housingLevyRate: 0.015,  // 1.5% Affordable Housing Levy
        nssfMaxLimit: 2400.00,   // Tier II NSSF Cap
        overtimeMultiplier: 1.5, // Standard overtime rate
      },
    },
  });

  // ==========================================
  // MODULE 3: DEPARTMENTAL SCALES & LOCAL RULES
  // ==========================================
  console.log('🏥 Seeding Department Structures...');
  
  const icuDept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ICU' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Intensive Care Unit',
      code: 'ICU',
      rules: {
        gracePeriodMinutes: 0,
        autoDeductBreakMinutes: 30,
        nightPremiumRate: 0.15,
      },
    },
  });

  const opdDept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OPD' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Outpatient Department',
      code: 'OPD',
      rules: {
        gracePeriodMinutes: 15,
        autoDeductBreakMinutes: 45,
        nightPremiumRate: 0.00,
      },
    },
  });

  // ==========================================
  // MODULE 4: HUMAN RESOURCES (STAFF REGISTER)
  // ==========================================
  console.log('👥 Seeding User Directory...');
  
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@stteresa.or.ke' } },
    update: {},
    create: {
      tenantId: tenant.id,
      departmentId: opdDept.id,
      payrollNumber: 'STTR-001',
      firstName: 'Joseph',
      lastName: 'Karanja',
      email: 'admin@stteresa.or.ke',
      passwordHash: '$2b$10$eFzMWW8.NreT6PZ2MDRYfO7zR1U6H.L0G26u4bZ0W3w1g4vK7V1S6', // Admin123!
      role: 'HOSPITAL_ADMIN',
      hourlyRate: 850.00,
      devicePin: '9999',
    },
  });

  const icuHead = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'matron.mercy@stteresa.or.ke' } },
    update: {},
    create: {
      tenantId: tenant.id,
      departmentId: icuDept.id,
      payrollNumber: 'STTR-101',
      firstName: 'Mercy',
      lastName: 'Achieng',
      email: 'matron.mercy@stteresa.or.ke',
      passwordHash: '$2b$10$eFzMWW8.NreT6PZ2MDRYfO7zR1U6H.L0G26u4bZ0W3w1g4vK7V1S6',
      role: 'DEPT_HEAD',
      hourlyRate: 650.00,
      devicePin: '1001',
    },
  });

  const floatingNurse = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'nurse.mwangi@stteresa.or.ke' } },
    update: {},
    create: {
      tenantId: tenant.id,
      departmentId: opdDept.id,
      payrollNumber: 'STTR-204',
      firstName: 'David',
      lastName: 'Mwangi',
      email: 'nurse.mwangi@stteresa.or.ke',
      passwordHash: '$2b$10$eFzMWW8.NreT6PZ2MDRYfO7zR1U6H.L0G26u4bZ0W3w1g4vK7V1S6',
      role: 'EMPLOYEE',
      hourlyRate: 450.00,
      devicePin: '1002',
    },
  });

  // ==========================================
  // MODULE 5: HARDWARE REGISTRY
  // ==========================================
  console.log('📟 Seeding Edge Hardware Terminals...');
  const icuGateDevice = await prisma.device.upsert({
    where: { serialCode: 'ZK-ADMS-ICUMAIN-01' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'ICU Bio Entry Gate A',
      serialCode: 'ZK-ADMS-ICUMAIN-01',
      ipAddress: '192.168.10.45',
      isActive: true,
    },
  });

  // ==========================================
  // MODULE 6: ROSTER & CLINICAL SHIFTS
  // ==========================================
  console.log('📅 Seeding Shift Templates & Floating Assignments...');
  
  const dayShiftTemplate = await prisma.shiftTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Clinical Day Rotation',
      type: 'MORNING',
      startTime: '07:00',
      endTime: '19:00',
    },
  });

  const todayString = new Date().toISOString().split('T')[0];
  const existingRosterAssignment = await prisma.rosterAssignment.findFirst({
    where: {
      tenantId: tenant.id,
      userId: floatingNurse.id,
      date: new Date(todayString),
      status: { not: 'CANCELLED' },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rosterAssignment = existingRosterAssignment ?? await prisma.rosterAssignment.create({
    data: {
      tenantId: tenant.id,
      userId: floatingNurse.id,
      departmentId: icuDept.id,
      shiftTemplateId: dayShiftTemplate.id,
      date: new Date(todayString),
      overriddenHourlyRate: 500.00,
      status: 'UNVERIFIED',
      startTimeSnapshot: dayShiftTemplate.startTime,
      endTimeSnapshot: dayShiftTemplate.endTime,
      gracePeriodSnapshot: dayShiftTemplate.gracePeriodMinutes,
      overtimeThresholdSnapshot: dayShiftTemplate.overtimeThresholdMinutes,
      overnightSnapshot: dayShiftTemplate.isOvernight,
    },
  });

  // ==========================================
  // MODULE 7: ATTENDANCE TELEMETRY LOGS
  // ==========================================
  console.log('⏰ Seeding Asynchronous Hardware Attendance Logs...');
  
  const clockInTimestamp = new Date(`${todayString}T06:58:12Z`);
  await prisma.attendanceLog.upsert({
    where: {
      userId_deviceId_direction_timestamp: {
        userId: floatingNurse.id,
        deviceId: icuGateDevice.id,
        direction: 'IN',
        timestamp: clockInTimestamp,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: floatingNurse.id,
      deviceId: icuGateDevice.id,
      rosterAssignmentId: rosterAssignment.id,
      direction: 'IN',
      timestamp: clockInTimestamp,
    },
  });

  const clockOutTimestamp = new Date(`${todayString}T19:02:44Z`);
  await prisma.attendanceLog.upsert({
    where: {
      userId_deviceId_direction_timestamp: {
        userId: floatingNurse.id,
        deviceId: icuGateDevice.id,
        direction: 'OUT',
        timestamp: clockOutTimestamp,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: floatingNurse.id,
      deviceId: icuGateDevice.id,
      rosterAssignmentId: rosterAssignment.id,
      direction: 'OUT',
      timestamp: clockOutTimestamp,
    },
  });

  // ==========================================
  // MODULE 8: RECONCILIATION CALCULATION STATE
  // ==========================================
  console.log('🤖 Seeding State Machine Aggregations...');
  await prisma.reconciliationLog.upsert({
    where: { rosterAssignmentId: rosterAssignment.id },
    update: {},
    create: {
      tenantId: tenant.id,
      rosterAssignmentId: rosterAssignment.id,
      clockInTime: clockInTimestamp,
      clockOutTime: clockOutTimestamp,
      calculatedBaseHours: 12.00,
      calculatedOvertime: 0.00,
      calculatedNightShift: 0.00,
      isFlagged: false,
      isResolved: true,
    },
  });

  // ==========================================
  // MODULE 9: LEAVE REGISTER
  // ==========================================
  console.log('🌴 Seeding Absence Management Records...');
  await prisma.leaveRequest.create({
    data: {
      tenantId: tenant.id,
      employeeId: floatingNurse.id,
      leaveType: 'ANNUAL',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-06-22'),
      reason: 'Visiting family in Nakuru',
      status: 'APPROVED',
      approvedById: icuHead.id,
    },
  });

  // ==========================================
  // MODULE 10: NOTIFICATION COMMUNICATIONS LOGS
  // ==========================================
  console.log('💬 Seeding Notification Audit Logs...');
  await prisma.notificationLog.create({
    data: {
      tenantId: tenant.id,
      userId: floatingNurse.id,
      channel: 'SMS',
      recipient: '+254712345678',
      title: 'Shift Confirmation',
      body: 'Hello David, you have been scheduled for an internal float rotation in the ICU department today starting at 07:00.',
      status: 'SENT',
    },
  });

  // ==========================================
  // MODULE 11: CACHED ANALYTICAL REPORTS
  // ==========================================
  console.log('📈 Seeding Analytics Snapshot Matrices...');
  await prisma.compiledReport.create({
    data: {
      tenantId: tenant.id,
      reportType: 'OVERTIME_AUDIT',
      generatedById: adminUser.id,
      dateRangeStart: new Date('2026-05-01'),
      dateRangeEnd: new Date('2026-05-31'),
      compiledData: {
        totalDepartmentalOvertimeHours: { ICU: 42.5, OPD: 12.0 },
        estimatedOvertimePayoutKsh: { ICU: 27625.00, OPD: 5400.00 },
      },
    },
  });

  // ==========================================
  // MODULE 12: FINANCIALS AND PAYROLL LOGS
  // ==========================================
  console.log('💰 Seeding Payroll Run Metrics...');
  const payrollPeriod = await prisma.payrollPeriod.create({
    data: {
      tenantId: tenant.id,
      name: 'May 2026 Main Cycle',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      status: 'OPEN',
    },
  });

  await prisma.payslip.create({
    data: {
      tenantId: tenant.id,
      periodId: payrollPeriod.id,
      employeeId: floatingNurse.id,
      hourlyRate: 500.00,
      regularHoursWorked: 168.00,
      overtimeHoursWorked: 8.00,
      baseSalary: 84000.00,
      overtimePay: 6000.00,
      allowances: 4500.00,
      totalGross: 94500.00,
      totalDeductions: 19830.00,
      netPay: 74670.00,
      deductionsBreakdown: {
        nssf: 2400.00,
        shif: 2598.75,
        housingLevy: 1417.50,
        paye: 13413.75,
      },
      allowancesBreakdown: {
        uniformAllowance: 4500.00,
      },
      status: 'UNPAID',
    },
  });

  console.log('🏁 Verification database population pipeline finished cleanly!');
}

main()
  .catch((e) => {
    console.error('❌ Critical failure detected in seed loop:', e);
    process.exit(1);
  });
  // 🚀 CLEAN: Disconnect hook is entirely handled by the runtime lifecycle of the singleton!
