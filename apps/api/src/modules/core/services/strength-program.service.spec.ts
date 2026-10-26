import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { EVENT_TYPE, SPORT_TYPE, StrengthContent } from '@openathlete/shared';

import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { EventService } from './event.service';
import {
  StrengthProgramService,
  buildStrengthEventName,
  collectExerciseNames,
} from './strength-program.service';

// The real EventService pulls ESM-only dependencies (Garmin FIT SDK)
jest.mock('./event.service', () => ({ EventService: class EventService {} }));

const COACH: AuthUser = {
  userId: 1,
  email: 'coach@test.com',
  athlete: null,
  coachAthletes: [{ athleteId: 10 }],
};

const exercise = (name: string) => ({
  id: name,
  name,
  sets: '3',
  reps: '12',
  load: '',
  rest: '',
  tempo: '',
  side: '',
  notes: '',
  mediaUrl: '',
  custom: [],
});

const CONTENT: StrengthContent = {
  blocks: [
    { type: 'exercise', id: 'a', exercise: exercise('Squat') },
    {
      type: 'circuit',
      id: 'b',
      name: 'Pieds',
      rounds: '3',
      rest: '',
      notes: '',
      exercises: [exercise('Mollets'), exercise(' Squat ')],
    },
    { type: 'note', id: 'c', text: 'Étirements' },
  ],
};

function createMockPrisma() {
  const prisma = {
    strengthProgram: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    strengthProgramSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      createMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    strengthExercise: { createMany: jest.fn() },
    event: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  return prisma;
}

describe('StrengthProgramService', () => {
  let service: StrengthProgramService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let eventService: { createEvent: jest.Mock; getEventById: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    eventService = {
      createEvent: jest.fn().mockResolvedValue({ eventId: 99 }),
      getEventById: jest.fn().mockResolvedValue({ eventId: 99 }),
    };
    prisma.strengthProgram.findUniqueOrThrow.mockResolvedValue({
      strengthProgramId: 5,
      sessions: [],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        StrengthProgramService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventService, useValue: eventService },
      ],
    }).compile();
    service = moduleRef.get(StrengthProgramService);
  });

  it('collects unique, trimmed exercise names from all blocks', () => {
    expect(collectExerciseNames(CONTENT)).toEqual(['Squat', 'Mollets']);
  });

  it('builds a calendar event name capped at 100 characters', () => {
    expect(buildStrengthEventName('Renfo jambes', 2, 1, 'Gainage')).toBe(
      'Renfo jambes · S2.1 · Gainage',
    );
    expect(buildStrengthEventName('x'.repeat(120), 1, 1, 'y')).toHaveLength(
      100,
    );
  });

  it('rejects access to a program owned by someone else', async () => {
    prisma.strengthProgram.findFirst.mockResolvedValue(null);
    await expect(service.getProgram(COACH, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.strengthProgram.findFirst).toHaveBeenCalledWith({
      where: { strengthProgramId: 5, userId: COACH.userId },
    });
  });

  it('copies a week as a new last week, keeping session numbers', async () => {
    prisma.strengthProgram.findFirst.mockResolvedValue({
      strengthProgramId: 5,
    });
    prisma.strengthProgramSession.findMany.mockResolvedValue([
      {
        sessionNumber: 1,
        name: 'A',
        notes: '',
        duration: 1800,
        content: CONTENT,
      },
      {
        sessionNumber: 2,
        name: 'B',
        notes: 'n',
        duration: null,
        content: CONTENT,
      },
    ]);
    prisma.strengthProgramSession.aggregate.mockResolvedValue({
      _max: { weekNumber: 3 },
    });

    await service.copyWeek(COACH, 5, 1);

    expect(prisma.strengthProgramSession.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          programId: 5,
          weekNumber: 4,
          sessionNumber: 1,
          name: 'A',
        }),
        expect.objectContaining({
          programId: 5,
          weekNumber: 4,
          sessionNumber: 2,
          name: 'B',
        }),
      ],
    });
  });

  it('places a copy of the session in the athlete calendar', async () => {
    prisma.strengthProgramSession.findFirst.mockResolvedValue({
      strengthProgramSessionId: 7,
      weekNumber: 2,
      sessionNumber: 1,
      name: 'Gainage',
      notes: 'Échauffement 10 min',
      duration: 1800,
      content: CONTENT,
      programId: 5,
      program: { name: 'Renfo jambes' },
    });
    const startDate = new Date('2026-11-03T08:00:00Z');

    await service.assignSession(COACH, 7, { startDate, athleteId: 10 });

    expect(prisma.strengthProgramSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          strengthProgramSessionId: 7,
          program: { userId: COACH.userId },
        },
      }),
    );
    expect(eventService.createEvent).toHaveBeenCalledWith(COACH, {
      type: EVENT_TYPE.TRAINING,
      sport: SPORT_TYPE.STRENGTH,
      name: 'Renfo jambes · S2.1 · Gainage',
      description: 'Échauffement 10 min',
      goalDuration: 1800,
      startDate,
      endDate: new Date('2026-11-03T08:30:00Z'),
      athleteId: 10,
      strengthContent: CONTENT,
    });
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { eventId: 99 },
      data: { strengthSessionId: 7 },
    });
  });
});
