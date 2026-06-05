import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients: Map<string, any> = new Map();

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { socketId: client.id });
    client.emit('connected', { message: 'Connected to notification server' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('ping')
  handlePing(): WsResponse<string> {
    return { event: 'pong', data: 'pong' };
  }

  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToTenant(tenantId: string, event: string, data: any): void {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  sendToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  getConnectedClients(): number {
    return this.connectedClients.size;
  }
}
