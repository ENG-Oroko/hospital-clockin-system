Here's the **README.md** for your notification module:

```markdown
# Notification Module

Notification management system for the H Clock-In System. Handles real-time alerts, email notifications, and SMS messages for attendance events, leave requests, and rule violations.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Notification Types](#notification-types)
- [Channels](#channels)
- [Rules Engine](#rules-engine)
- [API Endpoints](#api-endpoints)
- [Queues & Jobs](#queues--jobs)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This module provides a flexible, multi-channel notification system that:
- Triggers automatically based on attendance events
- Supports in-app, email, and SMS delivery
- Uses a rules engine for complex notification logic
- Queues notifications for reliable delivery
- Respects user preferences and quiet hours

## ✨ Features

- ✅ **Multi-channel delivery** (In-app, Email, SMS)
- ✅ **Rule-based triggers** (Late-in, missed punch, overtime)
- ✅ **Priority levels** (High, Medium, Low)
- ✅ **Queue-based processing** with retry logic
- ✅ **User preferences** (channel selection, quiet hours)
- ✅ **Template system** (Handlebars for emails, plain text for SMS)
- ✅ **Rate limiting** to prevent spam
- ✅ **Read receipts** tracking
- ✅ **Bulk notifications** support

## 📁 Folder Structure

```
notifications/
├── types/              # TypeScript interfaces and enums
├── dto/                # Data Transfer Objects (validation)
├── entities/           # Database entities (TypeORM)
├── repositories/       # Database operations
├── services/           # Business logic
│   ├── notification.service.ts    # Main service
│   ├── dispatcher.service.ts      # Routes to channels
│   ├── renderer.service.ts        # Template rendering
│   └── preference.service.ts      # User preferences
├── channels/           # Delivery channels
│   ├── in-app.channel.ts
│   ├── email.channel.ts
│   └── sms.channel.ts
├── rules/              # Notification trigger rules
│   ├── late-in.rule.ts
│   ├── missed-punch.rule.ts
│   └── overtime.rule.ts
├── listeners/          # Event listeners
├── jobs/               # Queue jobs
├── controllers/        # API endpoints
├── middlewares/        # Route middlewares
├── templates/          # Email/SMS templates
│   ├── email/          # .hbs files
│   └── sms/            # .txt files
└── migrations/         # Database migrations
```

## 🔧 Installation

1. **Install dependencies:**

```bash
npm install @nestjs/bull bull handlebars nodemailer twilio
npm install -D @types/nodemailer
```

2. **Import module in your `app.module.ts`:**

```typescript
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // ... other modules
    NotificationsModule,
  ],
})
export class AppModule {}
```

3. **Run migrations:**

```bash
npm run migration:run
```

## ⚙️ Configuration

Create these environment variables in your `.env` file:

```env
# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@hclock.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Queue Configuration (Bull/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Notification Settings
NOTIFICATION_RATE_LIMIT=10  # Max notifications per minute per user
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000  # milliseconds
```

## 🚀 Usage

### 1. Emitting Events from Main System

In your clock-in controller or service:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ClockInService {
  constructor(private eventEmitter: EventEmitter2) {}

  async clockIn(userId: string, shiftId: string) {
    // Your clock-in logic...
    
    // Emit event for notification
    this.eventEmitter.emit('clock-in.completed', {
      userId,
      shiftId,
      timestamp: new Date(),
      actualTime: new Date(),
      scheduledTime: shift.startTime,
    });
  }
}
```

### 2. Sending Manual Notifications

```typescript
import { NotificationService } from './notifications/services/notification.service';

@Injectable()
export class SomeService {
  constructor(private notificationService: NotificationService) {}

  async sendAlert() {
    await this.notificationService.send({
      userId: 'user-123',
      type: NotificationType.OVERTIME,
      priority: NotificationPriority.HIGH,
      title: 'Overtime Alert',
      body: 'You have exceeded your weekly hours',
      data: { overtimeMinutes: 45 }
    });
  }
}
```

### 3. User Preferences

Users can set their notification preferences:

```typescript
// Update preferences
await preferenceService.update('user-123', {
  channels: {
    email: true,
    sms: false,
    in_app: true
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00'
  },
  types: {
    late_in: { enabled: true, channels: ['email', 'in_app'] },
    missed_punch: { enabled: true, channels: ['sms', 'in_app'] }
  }
});
```

## 📢 Notification Types

| Type | Trigger | Priority | Default Channels |
|------|---------|----------|------------------|
| `late_in` | Clock-in after shift start | High | Email, In-app |
| `missed_punch` | No clock-out after 12 hours | High | SMS, In-app |
| `overtime_approaching` | 30 mins before overtime limit | Medium | In-app |
| `missed_break` | No break after 6 hours | Medium | In-app |
| `leave_request_created` | Employee submits leave | Medium | Email, In-app |
| `leave_request_approved` | Manager approves leave | Medium | Email, In-app |
| `timecard_edited` | Manager edits timecard | High | Email, In-app |
| `schedule_posted` | New schedule published | Low | In-app |
| `clock_in_reminder` | 9 AM no clock-in | Low | SMS, In-app |

## 📡 Channels

### In-App Channel
- Stores notifications in database
- Real-time delivery via WebSockets
- REST API for fetching notifications
- Supports read/unread status

### Email Channel
- HTML templates with Handlebars
- Supports attachments
- Delivery tracking (opened, clicked)
- Batch sending for digests

### SMS Channel
- Plain text only (160 chars limit)
- High priority for critical alerts
- Opt-out support (reply STOP)
- Cost tracking

## 🧠 Rules Engine

The rules engine automatically evaluates events and triggers notifications:

```typescript
// Example: Late-in rule
export class LateInRule implements IRule {
  evaluate(event: ClockInEvent): IRuleResult {
    const lateMinutes = this.calculateLateMinutes(event);
    
    if (lateMinutes > 5) {
      return {
        shouldNotify: true,
        type: NotificationType.LATE_IN,
        priority: NotificationPriority.HIGH,
        data: { lateMinutes, shiftStart: event.shiftStart }
      };
    }
    
    return { shouldNotify: false };
  }
}
```

## 🌐 API Endpoints

### Get User Notifications
```http
GET /api/notifications?page=1&limit=20&read=false
Authorization: Bearer <token>
```

### Mark as Read
```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read
```http
PATCH /api/notifications/mark-all-read
Authorization: Bearer <token>
```

### Get User Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

### Update Preferences
```http
PUT /api/notifications/preferences
Content-Type: application/json

{
  "channels": {
    "email": true,
    "sms": false,
    "in_app": true
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  }
}
```

### Bulk Dismiss
```http
POST /api/notifications/bulk-dismiss
Content-Type: application/json

{
  "notificationIds": ["id1", "id2", "id3"]
}
```

### Admin: Send Broadcast
```http
POST /api/notifications/admin/broadcast
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "body": "System will be down at 2 AM",
  "channels": ["email", "in_app"],
  "userIds": ["user1", "user2"]  // Optional: all users if omitted
}
```

## 🔄 Queues & Jobs

The module uses Bull queues for reliable processing:

### Notification Queue
- Processes all notifications asynchronously
- Retries failed notifications (exponential backoff)
- Priority-based processing (high priority first)

### Queue Monitoring
```bash
# View queue metrics
npm run queue:monitor

# Retry failed jobs
npm run queue:retry-failed

# Clear stuck jobs
npm run queue:clean
```

### Job Statuses
- `waiting` - Queued for processing
- `active` - Currently being processed
- `completed` - Successfully delivered
- `failed` - Delivery failed (will retry)
- `delayed` - Scheduled for later delivery

## 🧪 Testing

### Unit Tests
```bash
npm run test:notifications
```

### Specific Test Files
```bash
# Test dispatcher service
npm run test:notifications -- dispatcher.service.spec.ts

# Test late-in rule
npm run test:notifications -- late-in.rule.spec.ts

# Test email channel
npm run test:notifications -- email.channel.spec.ts
```

### Integration Tests
```bash
npm run test:e2e notifications
```

### Test Coverage
```bash
npm run test:cov notifications
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Emails not sending
- Check SMTP credentials in `.env`
- Verify `EMAIL_FROM` is a valid email
- Check spam folder
- Review SMTP logs: `npm run logs:email`

#### 2. SMS not delivering
- Verify Twilio account balance
- Check phone number format (E.164: +1234567890)
- Ensure number is verified in Twilio (trial account)

#### 3. Queue not processing
- Check Redis connection: `redis-cli ping`
- Verify worker is running: `npm run queue:worker`
- Check queue metrics: `npm run queue:monitor`

#### 4. Notifications not triggering
- Verify event emitter is configured
- Check listener is registered in module
- Enable debug logging: `DEBUG=notifications:* npm run start:dev`

### Debug Mode

```bash
# Enable verbose logging
DEBUG=notifications:* npm run start:dev

# Log specific components
DEBUG=notifications:dispatcher,notifications:email npm run start:dev
```

## 📊 Monitoring

### Metrics Available
- Notifications sent per channel
- Delivery success/failure rates
- Average processing time
- Queue length and throughput
- User engagement (read rates)

### Health Check Endpoint
```http
GET /api/notifications/health
```

Response:
```json
{
  "status": "healthy",
  "channels": {
    "email": "operational",
    "sms": "operational",
    "in_app": "operational"
  },
  "queue": {
    "waiting": 12,
    "active": 3,
    "completed": 1523,
    "failed": 2
  },
  "redis": "connected"
}
```

## 🤝 Contributing

1. Follow NestJS best practices
2. Add tests for new features
3. Update documentation
4. Run linting: `npm run lint`
5. Run tests: `npm run test`

## 📝 License

Private - H Clock-In System Internal Use Only

## 👥 Support

For issues or questions:
- Internal Wiki: [link]
- Slack Channel: #notifications-module
- Contact: backend-team@hclock.com

---

**Last Updated:** 2026-06-04
**Version:** 1.0.0
**Maintainer:** Backend Team
```

This README is comprehensive and ready to be placed in your `notifications` folder. Would you like me to adjust any section or add more specific details for your implementation?