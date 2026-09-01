import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/services/prisma.service';
import {
  EmailService,
  NotificationService,
  PushNotificationService,
} from './services';

@Module({
  providers: [
    NotificationService,
    PushNotificationService,
    EmailService,
    PrismaService,
  ],
  controllers: [],
  exports: [NotificationService, PushNotificationService, EmailService],
})
export class NotificationModule {}
