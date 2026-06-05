
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../services/notification.service';
import { NotificationsController } from '../notifications.controller';
import { DispatcherService } from '../services/dispatcher.service';
import { PreferenceService } from '../services/preference.service';

describe('Notification Module', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    findByUser: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    countUnread: jest.fn().mockResolvedValue(0),
    getSummary: jest.fn().mockResolvedValue({ total: 0, unread: 0, read: 0 }),
    findById: jest.fn().mockResolvedValue({ id: '123', title: 'Test' }),
    create: jest.fn().mockResolvedValue({ id: '123', title: 'Created' }),
    markAsRead: jest.fn().mockResolvedValue({}),
    markAllAsRead: jest.fn().mockResolvedValue(0),
    markBulkAsRead: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue({}),
    clearAll: jest.fn().mockResolvedValue(0),
    broadcast: jest.fn().mockResolvedValue(0),
    getAdminStats: jest.fn().mockResolvedValue({ total: 0, sent: 0, failed: 0 }),
    cleanup: jest.fn().mockResolvedValue(0),
    handleEmailWebhook: jest.fn().mockResolvedValue(undefined),
    handleSmsWebhook: jest.fn().mockResolvedValue(undefined),
  };

  const mockDispatcherService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
    sendNow: jest.fn().mockResolvedValue([{ success: true }]),
    retryFailed: jest.fn().mockResolvedValue(undefined),
  };

  const mockPreferenceService = {
    getAll: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({ total: 0, enabled: 0, disabled: 0 }),
    updatePreference: jest.fn().mockResolvedValue({}),
    bulkUpdate: jest.fn().mockResolvedValue([]),
    resetToDefault: jest.fn().mockResolvedValue(0),
    getUserSettings: jest.fn().mockResolvedValue({ quietHoursEnabled: false }),
    updateUserSettings: jest.fn().mockResolvedValue({}),
    updateQuietHours: jest.fn().mockResolvedValue(undefined),
    updateDigestSettings: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: DispatcherService,
          useValue: mockDispatcherService,
        },
        {
          provide: PreferenceService,
          useValue: mockPreferenceService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('GET /api/notifications', () => {
    it('should return notifications', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getUserNotifications(req, 1, 20, false, undefined);
      
      expect(result).toBeDefined();
      expect(mockNotificationsService.findByUser).toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/unread/count', () => {
    it('should return unread count', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getUnreadCount(req);
      
      expect(result).toEqual({ count: 0 });
      expect(mockNotificationsService.countUnread).toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/summary', () => {
    it('should return summary', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getSummary(req);
      
      expect(result).toBeDefined();
      expect(mockNotificationsService.getSummary).toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/:id', () => {
    it('should return a notification by id', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getNotification('123', req);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('123');
      expect(mockNotificationsService.findById).toHaveBeenCalledWith('123', 'tenant-1');
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a notification', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const dto = {
        channel: 'IN_APP',
        recipient: 'test@example.com',
        title: 'Test',
        body: 'Test body',
      };
      
      const result = await controller.createNotification(dto as any, req);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('123');
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.markAsRead('123', req);
      
      expect(result).toEqual({ success: true });
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('123', 'tenant-1');
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    it('should mark all as read', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.markAllAsRead(req);
      
      expect(result).toEqual({ count: 0 });
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.deleteNotification('123', req);
      
      expect(result).toEqual({ success: true });
      expect(mockNotificationsService.delete).toHaveBeenCalledWith('123', 'tenant-1');
    });
  });

  describe('DELETE /api/notifications/clear-all', () => {
    it('should clear all notifications', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.clearAllNotifications(req);
      
      expect(result).toEqual({ count: 0 });
      expect(mockNotificationsService.clearAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should get preferences', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getPreferences(req);
      
      expect(result).toBeDefined();
      expect(mockPreferenceService.getAll).toHaveBeenCalled();
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update preference', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const dto = { event: 'LATE_IN', channel: 'EMAIL', enabled: true };
      
      const result = await controller.updatePreference(dto as any, req);
      
      expect(result).toBeDefined();
      expect(mockPreferenceService.updatePreference).toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/settings', () => {
    it('should get user settings', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const result = await controller.getUserSettings(req);
      
      expect(result).toBeDefined();
      expect(mockPreferenceService.getUserSettings).toHaveBeenCalled();
    });
  });

  describe('PUT /api/notifications/settings/quiet-hours', () => {
    it('should update quiet hours', async () => {
      const req = { user: { id: 'user-1', tenantId: 'tenant-1' } };
      const dto = { enabled: true, start: '22:00', end: '07:00' };
      
      const result = await controller.updateQuietHours(dto, req);
      
      expect(result).toEqual({ success: true });
      expect(mockPreferenceService.updateQuietHours).toHaveBeenCalled();
    });
  });

  describe('Admin Endpoints', () => {
    it('should broadcast notification', async () => {
      const req = { user: { id: 'admin-1', tenantId: 'tenant-1' } };
      const dto = {
        title: 'Broadcast',
        body: 'Test broadcast',
        userIds: ['user1', 'user2'],
      };
      
      const result = await controller.broadcastNotification(dto, req);
      
      expect(result).toEqual({ success: true, count: 0 });
      expect(mockNotificationsService.broadcast).toHaveBeenCalled();
    });

    it('should get admin stats', async () => {
      const req = { user: { id: 'admin-1', tenantId: 'tenant-1' } };
      const result = await controller.getAdminStats(30, req);
      
      expect(result).toBeDefined();
      expect(mockNotificationsService.getAdminStats).toHaveBeenCalledWith('tenant-1', 30);
    });

    it('should retry failed notifications', async () => {
      const req = { user: { id: 'admin-1', tenantId: 'tenant-1' } };
      const result = await controller.retryFailedNotifications(req);
      
      expect(result).toEqual({ success: true });
      expect(mockDispatcherService.retryFailed).toHaveBeenCalledWith('tenant-1');
    });

    it('should cleanup old notifications', async () => {
      const req = { user: { id: 'admin-1', tenantId: 'tenant-1' } };
      const result = await controller.cleanupNotifications(90, req);
      
      expect(result).toEqual({ deletedCount: 0 });
      expect(mockNotificationsService.cleanup).toHaveBeenCalledWith('tenant-1', 90);
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle email webhook', async () => {
      const result = await controller.handleEmailWebhook({});
      
      expect(result).toEqual({ received: true });
      expect(mockNotificationsService.handleEmailWebhook).toHaveBeenCalled();
    });

    it('should handle SMS webhook', async () => {
      const result = await controller.handleSmsWebhook({});
      
      expect(result).toEqual({ received: true });
      expect(mockNotificationsService.handleSmsWebhook).toHaveBeenCalled();
    });
  });
});
