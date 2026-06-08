import { Module } from '@nestjs/common';
import { NotificationGateway } from './gateways/notification.gateway';
import { AttendanceGateway } from './gateways/attendance.gateway';
import { WebSocketService } from './services/websocket.service';
import { NotificationsModule } from '../notifications/notifications.module';


// 1. Added NotificationsModule import — WebSocketService injects NotificationsService
//    from it. Without this import NestJS cannot resolve the dependency.
// 2. Registered AttendanceGateway — it existed as a file but was never registered
//    in any module, so it never ran. It belongs here since it's a WS gateway.

@Module({
  imports: [
    NotificationsModule,
  ],
  providers: [
    NotificationGateway,
    AttendanceGateway,
    WebSocketService,
  ],
  exports: [
    NotificationGateway,
    AttendanceGateway,
    WebSocketService,
  ],
})
export class WebsocketModule {}