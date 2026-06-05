import { Module } from '@nestjs/common';
import { NotificationGateway } from './gateways/notification.gateway';
import { WebSocketService } from './services/websocket.service';

@Module({
  providers: [NotificationGateway, WebSocketService],
  exports: [NotificationGateway, WebSocketService],
})
export class WebsocketModule {}
