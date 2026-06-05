import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Notification System (E2E)', () => {
  let app: INestApplication;
  let tenantId: string;
  let userId: string;
  let notificationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    tenantId = 'test-tenant-001';
    userId = 'test-user-001';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Notification CRUD Operations', () => {
    it('should create a notification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/notifications')
        .send({
          tenantId,
          userId,
          title: 'Test Notification',
          body: 'This is a test notification',
          channel: 'IN_APP',
          recipient: userId,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Test Notification');
      notificationId = response.body.id;
    });

    it('should get all notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
    });

    it('should get notification by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/notifications/${notificationId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(notificationId);
    });

    it('should mark notification as read', async () => {
      await request(app.getHttpServer())
        .patch(`/api/notifications/${notificationId}/read`)
        .expect(200);
    });

    it('should get unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/unread/count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });
  });

  describe('Notification Preferences', () => {
    it('should get user preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should update user preference', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({
          event: 'LATE_IN',
          channel: 'EMAIL',
          enabled: true,
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Notification Settings', () => {
    it('should get user settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/settings')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should update quiet hours', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/settings/quiet-hours')
        .send({
          enabled: true,
          start: '22:00',
          end: '07:00',
        })
        .expect(200);
    });
  });
});
