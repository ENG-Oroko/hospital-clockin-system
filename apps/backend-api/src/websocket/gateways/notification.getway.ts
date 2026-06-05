// src/websocket/gateways/notification.gateway.ts
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
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { NotificationsService } from '../../notifications/services/notification.service';

interface ConnectedClient {
  userId: string;
  tenantId: string;
  socketId: string;
  roles: string[];
}

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
  private connectedClients: Map<string, ConnectedClient> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync(token);
      
      const clientInfo: ConnectedClient = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        socketId: client.id,
        roles: payload.roles || [],
      };
      
      this.connectedClients.set(client.id, clientInfo);
      
      // Join user to their private room
      client.join(`user:${clientInfo.userId}`);
      client.join(`tenant:${clientInfo.tenantId}`);
      
      // Send unread count on connection
      const unreadCount = await this.notificationsService.countUnread(
        clientInfo.tenantId,
        clientInfo.userId,
      );
      
      client.emit('unread_count', { count: unreadCount });
      
      this.logger.log(`Client connected: ${client.id} - User: ${clientInfo.userId}`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): WsResponse<string> {
    return { event: 'pong', data: 'pong' };
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<WsResponse<any>> {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    await this.notificationsService.markAsRead(data.notificationId, clientInfo.tenantId);
    
    // Update unread count for the user
    const unreadCount = await this.notificationsService.countUnread(
      clientInfo.tenantId,
      clientInfo.userId,
    );
    
    // Broadcast to all user's devices
    this.server.to(`user:${clientInfo.userId}`).emit('unread_count', { count: unreadCount });
    
    return { event: 'marked_read', data: { success: true, notificationId: data.notificationId } };
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket): Promise<WsResponse<any>> {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    await this.notificationsService.markAllAsRead(clientInfo.tenantId, clientInfo.userId);
    
    // Broadcast updated count
    this.server.to(`user:${clientInfo.userId}`).emit('unread_count', { count: 0 });
    
    return { event: 'marked_all_read', data: { success: true } };
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number; limit?: number },
  ): Promise<WsResponse<any>> {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    const notifications = await this.notificationsService.findByUser(
      clientInfo.tenantId,
      clientInfo.userId,
      data.page || 1,
      data.limit || 20,
      {},
    );
    
    return { event: 'notifications_list', data: notifications };
  }

  // Methods to send notifications from server
  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToTenant(tenantId: string, event: string, data: any): void {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  sendToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  async sendNotification(userId: string, notification: any): Promise<void> {
    this.sendToUser(userId, 'new_notification', notification);
    
    // Update unread count
    const clientInfo = Array.from(this.connectedClients.values()).find(
      c => c.userId === userId,
    );
    if (clientInfo) {
      const unreadCount = await this.notificationsService.countUnread(
        clientInfo.tenantId,
        userId,
      );
      this.sendToUser(userId, 'unread_count', { count: unreadCount });
    }
  }

  private extractToken(client: Socket): string {
    const token = client.handshake.auth.token || client.handshake.headers.authorization;
    if (!token) {
      throw new Error('No token provided');
    }
    return token.replace('Bearer ', '');
  }

  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  getConnectedClientsByUser(userId: string): ConnectedClient[] {
    return Array.from(this.connectedClients.values()).filter(c => c.userId === userId);
  }
}
