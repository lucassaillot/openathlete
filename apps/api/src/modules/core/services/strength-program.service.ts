import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@openathlete/database';
import {
  AssignStrengthSessionDto,
  CreateStrengthCategoryDto,
  CreateStrengthProgramDto,
  CreateStrengthSessionDto,
  EVENT_TYPE,
  SPORT_TYPE,
  StrengthContent,
  UpdateStrengthCategoryDto,
  UpdateStrengthProgramDto,
  UpdateStrengthSessionDto,
  UpsertStrengthExerciseDto,
} from '@openathlete/shared';

import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { EventService } from './event.service';

const EMPTY_CONTENT: StrengthContent = { blocks: [] };
const DEFAULT_SESSION_DURATION = 3600;
const MAX_EVENT_NAME_LENGTH = 100;

/** Exercise names used in a session, for the personal exercise library. */
export function collectExerciseNames(content: StrengthContent): string[] {
  const names = new Set<string>();
  for (const block of content.blocks) {
    if (block.type === 'exercise') names.add(block.exercise.name.trim());
    if (block.type === 'circuit') {
      block.exercises.forEach((e) => names.add(e.name.trim()));
    }
  }
  names.delete('');
  return [...names];
}

/** Calendar event name, e.g. "Renfo jambes · S2 · Séance 1 – Gainage". */
export function buildStrengthEventName(
  programName: string,
  weekNumber: number,
  sessionNumber: number,
  sessionName: string,
): string {
  const name = `${programName} · S${weekNumber}.${sessionNumber} · ${sessionName}`;
  return name.length > MAX_EVENT_NAME_LENGTH
    ? `${name.slice(0, MAX_EVENT_NAME_LENGTH - 1)}…`
    : name;
}

@Injectable()
export class StrengthProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  // -------------------------------------------------------------------------
  // Ownership helpers
  // -------------------------------------------------------------------------

  private async getOwnedProgram(user: AuthUser, programId: number) {
    const program = await this.prisma.strengthProgram.findFirst({
      where: { strengthProgramId: programId, userId: user.userId },
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  private async getOwnedSession(user: AuthUser, sessionId: number) {
    const session = await this.prisma.strengthProgramSession.findFirst({
      where: {
        strengthProgramSessionId: sessionId,
        program: { userId: user.userId },
      },
      include: { program: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async getOwnedCategory(user: AuthUser, categoryId: number) {
    const category = await this.prisma.strengthCategory.findFirst({
      where: { strengthCategoryId: categoryId, userId: user.userId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async rememberExercises(user: AuthUser, content: StrengthContent) {
    const names = collectExerciseNames(content);
    if (names.length === 0) return;
    await this.prisma.strengthExercise.createMany({
      data: names.map((name) => ({ name, userId: user.userId })),
      skipDuplicates: true,
    });
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  getCategories(user: AuthUser) {
    return this.prisma.strengthCategory.findMany({
      where: { userId: user.userId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(user: AuthUser, dto: CreateStrengthCategoryDto) {
    if (dto.parentCategoryId) {
      await this.getOwnedCategory(user, dto.parentCategoryId);
    }
    return this.prisma.strengthCategory.create({
      data: {
        name: dto.name,
        color: dto.color,
        parentCategoryId: dto.parentCategoryId ?? null,
        userId: user.userId,
      },
    });
  }

  async updateCategory(
    user: AuthUser,
    categoryId: number,
    dto: UpdateStrengthCategoryDto,
  ) {
    await this.getOwnedCategory(user, categoryId);
    if (dto.parentCategoryId) {
      if (dto.parentCategoryId === categoryId) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.getOwnedCategory(user, dto.parentCategoryId);
    }
    return this.prisma.strengthCategory.update({
      where: { strengthCategoryId: categoryId },
      data: dto,
    });
  }

  async deleteCategory(user: AuthUser, categoryId: number) {
    await this.getOwnedCategory(user, categoryId);
    // Programs and sub-categories are kept (foreign keys are SET NULL)
    await this.prisma.strengthCategory.delete({
      where: { strengthCategoryId: categoryId },
    });
  }

  // -------------------------------------------------------------------------
  // Programs
  // -------------------------------------------------------------------------

  async getPrograms(user: AuthUser) {
    const programs = await this.prisma.strengthProgram.findMany({
      where: { userId: user.userId },
      include: {
        category: true,
        sessions: { select: { weekNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return programs.map(({ sessions, ...program }) => ({
      ...program,
      weekCount: sessions.reduce((max, s) => Math.max(max, s.weekNumber), 0),
      sessionCount: sessions.length,
    }));
  }

  async getProgram(user: AuthUser, programId: number) {
    await this.getOwnedProgram(user, programId);
    const program = await this.prisma.strengthProgram.findUniqueOrThrow({
      where: { strengthProgramId: programId },
      include: {
        category: true,
        sessions: {
          orderBy: [{ weekNumber: 'asc' }, { sessionNumber: 'asc' }],
        },
      },
    });
    return {
      ...program,
      weekCount: program.sessions.reduce(
        (max, s) => Math.max(max, s.weekNumber),
        0,
      ),
      sessionCount: program.sessions.length,
    };
  }

  async createProgram(user: AuthUser, dto: CreateStrengthProgramDto) {
    if (dto.categoryId) await this.getOwnedCategory(user, dto.categoryId);
    const program = await this.prisma.strengthProgram.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        categoryId: dto.categoryId ?? null,
        userId: user.userId,
      },
    });
    return this.getProgram(user, program.strengthProgramId);
  }

  async updateProgram(
    user: AuthUser,
    programId: number,
    dto: UpdateStrengthProgramDto,
  ) {
    await this.getOwnedProgram(user, programId);
    if (dto.categoryId) await this.getOwnedCategory(user, dto.categoryId);
    await this.prisma.strengthProgram.update({
      where: { strengthProgramId: programId },
      data: dto,
    });
    return this.getProgram(user, programId);
  }

  async deleteProgram(user: AuthUser, programId: number) {
    await this.getOwnedProgram(user, programId);
    // Calendar events keep their own copy; their link is SET NULL
    await this.prisma.strengthProgram.delete({
      where: { strengthProgramId: programId },
    });
  }

  // -------------------------------------------------------------------------
  // Weeks
  // -------------------------------------------------------------------------

  /** Appends a copy of `weekNumber` as a new last week. */
  async copyWeek(user: AuthUser, programId: number, weekNumber: number) {
    await this.getOwnedProgram(user, programId);
    const sessions = await this.prisma.strengthProgramSession.findMany({
      where: { programId, weekNumber },
      orderBy: { sessionNumber: 'asc' },
    });
    const last = await this.prisma.strengthProgramSession.aggregate({
      where: { programId },
      _max: { weekNumber: true },
    });
    const newWeek = (last._max.weekNumber ?? 0) + 1;
    if (sessions.length > 0) {
      await this.prisma.strengthProgramSession.createMany({
        data: sessions.map((s) => ({
          programId,
          weekNumber: newWeek,
          sessionNumber: s.sessionNumber,
          name: s.name,
          notes: s.notes,
          duration: s.duration,
          content: s.content as Prisma.InputJsonValue,
        })),
      });
    }
    return this.getProgram(user, programId);
  }

  /** Deletes a week and shifts the following weeks up. */
  async deleteWeek(user: AuthUser, programId: number, weekNumber: number) {
    await this.getOwnedProgram(user, programId);
    await this.prisma.$transaction([
      this.prisma.strengthProgramSession.deleteMany({
        where: { programId, weekNumber },
      }),
      this.prisma.strengthProgramSession.updateMany({
        where: { programId, weekNumber: { gt: weekNumber } },
        data: { weekNumber: { decrement: 1 } },
      }),
    ]);
    return this.getProgram(user, programId);
  }

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------

  async createSession(
    user: AuthUser,
    programId: number,
    dto: CreateStrengthSessionDto,
  ) {
    await this.getOwnedProgram(user, programId);
    const last = await this.prisma.strengthProgramSession.aggregate({
      where: { programId, weekNumber: dto.weekNumber },
      _max: { sessionNumber: true },
    });
    const content = dto.content ?? EMPTY_CONTENT;
    const session = await this.prisma.strengthProgramSession.create({
      data: {
        programId,
        weekNumber: dto.weekNumber,
        sessionNumber: (last._max.sessionNumber ?? 0) + 1,
        name: dto.name,
        notes: dto.notes ?? '',
        duration: dto.duration ?? null,
        content: content as Prisma.InputJsonValue,
      },
    });
    await this.rememberExercises(user, content);
    await this.touchProgram(programId);
    return session;
  }

  async updateSession(
    user: AuthUser,
    sessionId: number,
    dto: UpdateStrengthSessionDto,
  ) {
    const existing = await this.getOwnedSession(user, sessionId);
    const session = await this.prisma.strengthProgramSession.update({
      where: { strengthProgramSessionId: sessionId },
      data: {
        name: dto.name,
        notes: dto.notes,
        duration: dto.duration,
        content: dto.content as Prisma.InputJsonValue | undefined,
      },
    });
    if (dto.content) await this.rememberExercises(user, dto.content);
    await this.touchProgram(existing.programId);
    return session;
  }

  /** Deletes a session and renumbers the following ones in its week. */
  async deleteSession(user: AuthUser, sessionId: number) {
    const session = await this.getOwnedSession(user, sessionId);
    await this.prisma.$transaction([
      this.prisma.strengthProgramSession.delete({
        where: { strengthProgramSessionId: sessionId },
      }),
      this.prisma.strengthProgramSession.updateMany({
        where: {
          programId: session.programId,
          weekNumber: session.weekNumber,
          sessionNumber: { gt: session.sessionNumber },
        },
        data: { sessionNumber: { decrement: 1 } },
      }),
    ]);
    await this.touchProgram(session.programId);
  }

  /** Places a copy of the session in an athlete's calendar. */
  async assignSession(
    user: AuthUser,
    sessionId: number,
    dto: AssignStrengthSessionDto,
  ) {
    const session = await this.getOwnedSession(user, sessionId);
    const startDate = new Date(dto.startDate);
    const duration = session.duration || DEFAULT_SESSION_DURATION;
    const endDate = new Date(startDate.getTime() + duration * 1000);

    // createEvent checks that the user may plan for this athlete
    const created = await this.eventService.createEvent(user, {
      type: EVENT_TYPE.TRAINING,
      sport: SPORT_TYPE.STRENGTH,
      name: buildStrengthEventName(
        session.program.name,
        session.weekNumber,
        session.sessionNumber,
        session.name,
      ),
      description: session.notes,
      goalDuration: session.duration ?? null,
      startDate,
      endDate,
      athleteId: dto.athleteId ?? undefined,
      strengthContent: session.content as StrengthContent,
    });

    await this.prisma.event.update({
      where: { eventId: created.eventId },
      data: { strengthSessionId: session.strengthProgramSessionId },
    });

    return this.eventService.getEventById(user, created.eventId);
  }

  private async touchProgram(programId: number) {
    await this.prisma.strengthProgram.update({
      where: { strengthProgramId: programId },
      data: { updatedAt: new Date() },
    });
  }

  // -------------------------------------------------------------------------
  // Exercise library
  // -------------------------------------------------------------------------

  getExercises(user: AuthUser) {
    return this.prisma.strengthExercise.findMany({
      where: { userId: user.userId },
      orderBy: { name: 'asc' },
    });
  }

  upsertExercise(user: AuthUser, dto: UpsertStrengthExerciseDto) {
    const data = {
      defaultNotes: dto.defaultNotes,
      mediaUrl: dto.mediaUrl,
    };
    return this.prisma.strengthExercise.upsert({
      where: { userId_name: { userId: user.userId, name: dto.name } },
      create: { ...data, name: dto.name, userId: user.userId },
      update: data,
    });
  }

  async deleteExercise(user: AuthUser, exerciseId: number) {
    const exercise = await this.prisma.strengthExercise.findFirst({
      where: { strengthExerciseId: exerciseId, userId: user.userId },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    await this.prisma.strengthExercise.delete({
      where: { strengthExerciseId: exerciseId },
    });
  }
}
