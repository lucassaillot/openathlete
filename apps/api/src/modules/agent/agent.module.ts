import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { CoreModule } from '../core/core.module';
import { PrismaService } from '../prisma/services/prisma.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { AIFeaturesController } from './controllers/ai-features.controller';
import { EventGenerationService } from './services/event-generation.service';
import { EventModificationService } from './services/event-modification.service';

@Module({
  imports: [AuthModule, CoreModule, WebSocketModule],
  controllers: [AIFeaturesController],
  providers: [EventGenerationService, EventModificationService, PrismaService],
  exports: [],
})
export class AgentModule {}
