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
  namespace: 'attendance',
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttendanceGateway.name);
  private userSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to attendance gateway',
      timestamp: new Date(),
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
    return { event: 'pong', data: 'pong' };
  }

  @SubscribeMessage('register')
  handleRegister(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    if (data.userId) {
      this.userSockets.set(data.userId, client.id);
      client.join(`user:${data.userId}`);
      client.emit('registered', { userId: data.userId, success: true });
      this.logger.log(`User ${data.userId} registered`);
    }
  }

  @SubscribeMessage('subscribe:attendance')
  handleSubscribeAttendance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; tenantId: string }
  ) {
    if (data.userId) {
      client.join(`attendance:${data.userId}`);
    }
    if (data.tenantId) {
      client.join(`tenant:${data.tenantId}`);
    }
    client.emit('subscribed', { 
      userId: data.userId, 
      tenantId: data.tenantId,
      success: true 
    });
  }

  // Emit methods for services
  notifyUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  notifyTenant(tenantId: string, event: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  notifyAttendanceEvent(userId: string, event: string, payload: any) {
    this.server.to(`attendance:${userId}`).emit(event, {
      ...payload,
      timestamp: new Date(),
    });
  }
}
