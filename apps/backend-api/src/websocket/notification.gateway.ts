import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, string[]>(); // tenantId -> socketIds[]
  private userSockets = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to notification gateway',
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up disconnected user
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; tenantId: string }
  ) {
    if (data.userId) {
      this.userSockets.set(data.userId, client.id);
      client.join(`user:${data.userId}`);
      client.join(`tenant:${data.tenantId}`);
      
      client.emit('registered', {
        userId: data.userId,
        tenantId: data.tenantId,
        success: true,
      });
      
      this.logger.log(`User ${data.userId} registered for notifications`);
    }
  }

  @SubscribeMessage('subscribe:notifications')
  handleSubscribeNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    if (data.userId) {
      client.join(`notifications:${data.userId}`);
      client.emit('subscribed', {
        channel: `notifications:${data.userId}`,
        success: true,
      });
    }
  }

  // Emit real-time notification to user
  notifyUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
    
    this.server.to(`notifications:${userId}`).emit('new_notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  // Emit to all users in a tenant
  notifyTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }
}
