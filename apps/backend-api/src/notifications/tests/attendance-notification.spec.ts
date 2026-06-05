import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationListener, ClockInEvent } from '../listeners/notification.listener';
import { DispatcherService } from '../services/dispatcher.service';
import { LateInRule } from '../rules/late-in.rule';
import { MissedPunchRule } from '../rules/missed-punch.rule';
import { OvertimeRule } from '../rules/overtime.rule';
import { WebSocketService } from '../../websocket/services/websocket.service';

describe('Attendance Notifications', () => {
  let listener: NotificationListener;
  let dispatcherService: DispatcherService;
  let lateInRule: LateInRule;
  let webSocketService: WebSocketService;

  const mockDispatcherService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
    bulkDispatch: jest.fn().mockResolvedValue(undefined),
  };

  const mockLateInRule = {
    evaluate: jest.fn().mockResolvedValue({
      shouldNotify: true,
      lateMinutes: 15,
      payload: { test: 'payload' },
    }),
  };

  const mockMissedPunchRule = {
    evaluate: jest.fn().mockResolvedValue({
      shouldNotify: false,
    }),
  };

  const mockOvertimeRule = {
    evaluate: jest.fn().mockResolvedValue({
      shouldNotify: false,
    }),
  };

  const mockWebSocketService = {
    sendAttendanceAlert: jest.fn().mockResolvedValue(undefined),
    sendNotificationToUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        {
          provide: DispatcherService,
          useValue: mockDispatcherService,
        },
        {
          provide: LateInRule,
          useValue: mockLateInRule,
        },
        {
          provide: MissedPunchRule,
          useValue: mockMissedPunchRule,
        },
        {
          provide: OvertimeRule,
          useValue: mockOvertimeRule,
        },
        {
          provide: WebSocketService,
          useValue: mockWebSocketService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    listener = module.get<NotificationListener>(NotificationListener);
    dispatcherService = module.get<DispatcherService>(DispatcherService);
    lateInRule = module.get<LateInRule>(LateInRule);
    webSocketService = module.get<WebSocketService>(WebSocketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockClockInEvent: ClockInEvent = {
    tenantId: 'tenant-001',
    userId: 'user-123',
    employeeId: 'emp-123',
    employeeName: 'John Doe',
    employeeEmail: 'john@example.com',
    employeePhone: '+1234567890',
    attendanceRecordId: 'att-123',
    shiftId: 'shift-123',
    shiftDate: new Date(),
    scheduledStartTime: '09:00',
    actualClockInTime: new Date(),
    scheduledEndTime: '17:00',
    department: 'Engineering',
    departmentId: 'dept-123',
    managerId: 'mgr-123',
    managerName: 'Jane Manager',
    managerEmail: 'jane@example.com',
    companyId: 'company-123',
    isHoliday: false,
    isWeekend: false,
  };

  describe('Clock-In Notifications', () => {
    it('should handle clock-in event and dispatch notification', async () => {
      await listener.handleClockIn(mockClockInEvent);
      
      expect(lateInRule.evaluate).toHaveBeenCalledWith(mockClockInEvent);
      expect(mockDispatcherService.dispatch).toHaveBeenCalled();
    });

    it('should send WebSocket notification for late arrival', async () => {
      await listener.handleClockIn(mockClockInEvent);
      
      expect(mockWebSocketService.sendAttendanceAlert).toHaveBeenCalledWith(
        mockClockInEvent.userId,
        mockClockInEvent.tenantId,
        'late_in',
        expect.objectContaining({
          lateMinutes: 15,
          shiftStart: mockClockInEvent.scheduledStartTime,
        }),
      );
    });

    it('should notify manager for significant lateness', async () => {
      mockLateInRule.evaluate.mockResolvedValueOnce({
        shouldNotify: true,
        lateMinutes: 35,
        payload: { test: 'payload' },
      });
      
      await listener.handleClockIn(mockClockInEvent);
      
      // For 35 minutes late, should notify manager
      expect(mockWebSocketService.sendNotificationToUser).toHaveBeenCalled();
    });
  });
});
