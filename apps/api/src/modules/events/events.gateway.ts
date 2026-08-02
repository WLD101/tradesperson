import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verifySessionToken } from '@tradesperson/auth';
import { loadEnv } from '@tradesperson/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/v1/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly env = loadEnv();

  async handleConnection(client: Socket) {
    try {
      let token = client.handshake.auth?.token;
      
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key) acc[key] = value ?? '';
          return acc;
        }, {} as Record<string, string>);
        token = cookies['tp_session'];
      }

      if (!token) {
        throw new Error('No authentication token provided');
      }

      const payload = await verifySessionToken(
        token,
        this.env.AUTH_SECRET,
        this.env.AUTH_ISSUER,
        this.env.AUTH_AUDIENCE,
      );

      const tenantId = payload.tenantId;
      if (!tenantId) {
        throw new Error('No tenant associated with this session');
      }

      const room = `tenant_${tenantId}`;
      await client.join(room);
      
      // We can also attach the user to the socket object for later use
      (client as any).user = payload;
      
      this.logger.log(`Client ${client.id} connected and joined room ${room}`);
    } catch (err) {
      this.logger.warn(`Unauthorized WebSocket connection attempt: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribeJob')
  handleSubscribeJob(
    @MessageBody() jobId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (user?.tenantId) {
      const room = `job_${user.tenantId}_${jobId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} subscribed to ${room}`);
      return { event: 'subscribed', data: { room } };
    }
  }

  @SubscribeMessage('updateTechLocation')
  handleUpdateTechLocation(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (user?.tenantId) {
      // Broadcast location to tenant room (e.g., dispatcher dashboard)
      client.to(`tenant_${user.tenantId}`).emit('techLocation.updated', {
        userId: user.sub,
        ...data,
      });
    }
  }
}
