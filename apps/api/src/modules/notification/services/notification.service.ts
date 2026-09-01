import { Injectable, Logger } from '@nestjs/common';

import {
  EmailId,
  EmailLanguage,
  EmailPropsFromId,
  emailLibrary,
} from '@openathlete/shared';

import { Language } from 'src/common/constants/languages.constant';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { brand } from '../emails/core/brand';
import { emailTemplates } from '../emails/templates';
import { SendEmail } from '../types';
import { EmailService } from './email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail<T extends EmailId>(payload: SendEmail<T>) {
    try {
      // Get user language from database, default to FR if user not found
      const user = await this.prisma.user.findUnique({
        where: { email: payload.to },
        select: { language: true },
      });

      const language: EmailLanguage = (user?.language ||
        Language.FR) as EmailLanguage;

      const defaultSubject = emailLibrary[payload.type].defaultSubject;
      const subject = payload.subject || defaultSubject[language];

      const buildHtml = emailTemplates[payload.type] as (
        props: EmailPropsFromId<T> & { language?: EmailLanguage },
      ) => string;
      const html = buildHtml
        ? buildHtml({ ...payload.params, language })
        : `<p>${subject}</p>`;

      await this.emailService.sendEmail({
        to: payload.to,
        subject,
        html,
        fromName: brand.name,
      });
    } catch (error) {
      this.logger.error(
        `Error sending email: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
