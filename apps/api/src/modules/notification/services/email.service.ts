import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnvSchemaType } from '@openathlete/shared';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

/**
 * Single point of contact with the mail server (SMTP). Every part of the
 * app that sends an email should go through this service instead of
 * building its own transporter.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService<ApiEnvSchemaType, true>,
  ) {
    this.fromEmail = this.configService.get('SMTP_FROM_EMAIL');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail({ to, subject, html, fromName }: SendEmailInput) {
    try {
      await this.transporter.sendMail({
        from: fromName
          ? { name: fromName, address: this.fromEmail }
          : this.fromEmail,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Error sending email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
