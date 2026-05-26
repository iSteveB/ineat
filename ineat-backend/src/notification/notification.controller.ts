import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async listNotifications(
    @Req() req: Request,
    @Query('includeRead') includeRead?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req.user as { id: string }).id;
    const notifications = await this.notificationService.listNotifications(
      userId,
      {
        includeRead: includeRead === 'true',
        limit: limit ? Number(limit) : undefined,
      },
    );

    return {
      success: true,
      data: notifications,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    const count = await this.notificationService.countUnread(userId);

    return {
      success: true,
      data: { count },
    };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    const result = await this.notificationService.markAllAsRead(userId);

    return {
      success: true,
      data: result,
    };
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @Req() req: Request,
    @Param('notificationId') notificationId: string,
    @Body() body?: { isRead?: boolean },
  ) {
    const userId = (req.user as { id: string }).id;
    const notification = await this.notificationService.markAsRead(
      userId,
      notificationId,
      body?.isRead ?? true,
    );

    return {
      success: true,
      data: notification,
    };
  }
}
