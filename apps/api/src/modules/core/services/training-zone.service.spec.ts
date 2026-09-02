import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { TrainingZoneType } from '@openathlete/database';
import {
  SPORT_TYPE,
  TRAINING_ZONE_TYPE,
  trainingZoneValueDtoSchema,
} from '@openathlete/shared';

import { CaslAbilityFactory } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { TrainingZoneService } from './training-zone.service';

const COACH_USER: AuthUser = {
  userId: 1,
  email: 'coach@test.com',
  athlete: null,
  coachAthletes: [{ athleteId: 10 }],
};

const UNRELATED_COACH_USER: AuthUser = {
  userId: 2,
  email: 'other-coach@test.com',
  athlete: null,
  coachAthletes: [{ athleteId: 999 }],
};

const ATHLETE_USER: AuthUser = {
  userId: 3,
  email: 'athlete@test.com',
  athlete: { athleteId: 10 },
  coachAthletes: [],
};

function makeAbility(canResult: boolean) {
  return { can: jest.fn().mockReturnValue(canResult) };
}

function createMockPrisma() {
  const prisma: Record<string, unknown> = {
    athlete: { findUnique: jest.fn() },
    trainingZone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    trainingZoneValue: {
      deleteMany: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return prisma as unknown as PrismaService & {
    athlete: { findUnique: jest.Mock };
    trainingZone: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    trainingZoneValue: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
}

describe('TrainingZoneService', () => {
  let service: TrainingZoneService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let abilities: { getFor: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    abilities = { getFor: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrainingZoneService,
        { provide: PrismaService, useValue: prisma },
        { provide: CaslAbilityFactory, useValue: abilities },
      ],
    }).compile();

    service = moduleRef.get(TrainingZoneService);
  });

  describe('getAllForAthlete', () => {
    it('allows a coach linked via CoachAthlete to read the zones', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([{ trainingZoneId: 1 }]);

      const result = await service.getAllForAthlete(COACH_USER, 10);

      expect(result).toEqual([{ trainingZoneId: 1 }]);
      expect(prisma.trainingZone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { athleteId: 10 } }),
      );
    });

    it('rejects a coach not linked to the athlete', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.getAllForAthlete(UNRELATED_COACH_USER, 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an athlete to read their own zones', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([]);

      await expect(service.getAllForAthlete(ATHLETE_USER, 10)).resolves.toEqual(
        [],
      );
    });

    it('throws NotFoundException when the athlete does not exist', async () => {
      prisma.athlete.findUnique.mockResolvedValue(null);

      await expect(
        service.getAllForAthlete(COACH_USER, 10),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a zone with the computed index when authorized', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([]); // no siblings
      prisma.trainingZone.count.mockResolvedValue(2);
      prisma.trainingZone.create.mockResolvedValue({ trainingZoneId: 5 });

      await service.create(COACH_USER, {
        name: 'Zone 3',
        description: '',
        type: TRAINING_ZONE_TYPE.HEARTRATE,
        color: '#fff',
        athleteId: 10,
        values: [{ min: 150, max: 160, sports: [SPORT_TYPE.RUNNING] }],
      });

      expect(prisma.trainingZone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ index: 2, athleteId: 10 }),
        }),
      );
    });

    it('rejects when the user is not allowed to update the athlete', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.create(UNRELATED_COACH_USER, {
          name: 'Zone 3',
          description: '',
          type: TRAINING_ZONE_TYPE.HEARTRATE,
          color: '#fff',
          athleteId: 10,
          values: [{ min: 150, max: 160, sports: [SPORT_TYPE.RUNNING] }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.trainingZone.create).not.toHaveBeenCalled();
    });

    it('rejects a value that overlaps an existing sibling zone for a shared sport', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([
        {
          trainingZoneId: 1,
          name: 'Zone 1',
          values: [{ min: 0, max: 131, sports: ['RUNNING'] }],
        },
      ]);

      await expect(
        service.create(COACH_USER, {
          name: 'Zone 2',
          description: '',
          type: TRAINING_ZONE_TYPE.HEARTRATE,
          color: '#fff',
          athleteId: 10,
          values: [{ min: 100, max: 150, sports: [SPORT_TYPE.RUNNING] }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.trainingZone.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('replaces the zone values inside a transaction when authorized', async () => {
      prisma.trainingZone.findUnique.mockResolvedValue({
        trainingZoneId: 1,
        athleteId: 10,
        type: TrainingZoneType.HEARTRATE,
        values: [{ trainingZoneValueId: 1, min: 0, max: 131, sports: [] }],
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([]); // no siblings
      prisma.trainingZone.update.mockResolvedValue({ trainingZoneId: 1 });

      await service.update(COACH_USER, 1, {
        name: 'Zone 1',
        description: '',
        color: '#fff',
        values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
      });

      expect(prisma.trainingZoneValue.deleteMany).toHaveBeenCalledWith({
        where: { trainingZoneId: 1 },
      });
      expect(prisma.trainingZone.update).toHaveBeenCalled();
    });

    it('rejects when not authorized', async () => {
      prisma.trainingZone.findUnique.mockResolvedValue({
        trainingZoneId: 1,
        athleteId: 10,
        type: TrainingZoneType.HEARTRATE,
        values: [],
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.update(UNRELATED_COACH_USER, 1, {
          name: 'Zone 1',
          description: '',
          color: '#fff',
          values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the zone does not exist', async () => {
      prisma.trainingZone.findUnique.mockResolvedValue(null);

      await expect(
        service.update(COACH_USER, 999, {
          name: 'Zone 1',
          description: '',
          color: '#fff',
          values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes the values before deleting the zone, atomically', async () => {
      prisma.trainingZone.findUnique.mockResolvedValue({
        trainingZoneId: 1,
        athleteId: 10,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));

      const result = await service.delete(COACH_USER, 1);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.trainingZoneValue.deleteMany).toHaveBeenCalledWith({
        where: { trainingZoneId: 1 },
      });
      expect(prisma.trainingZone.delete).toHaveBeenCalledWith({
        where: { trainingZoneId: 1 },
      });
      expect(result).toEqual({ success: true });
    });

    it('rejects when the athlete cannot be managed by this user', async () => {
      prisma.trainingZone.findUnique.mockResolvedValue({
        trainingZoneId: 1,
        athleteId: 10,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.delete(UNRELATED_COACH_USER, 1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.trainingZone.delete).not.toHaveBeenCalled();
    });
  });

  describe('replaceForType', () => {
    const existingZoneA = {
      trainingZoneId: 1,
      athleteId: 10,
      type: TrainingZoneType.HEARTRATE,
      values: [{ min: 0, max: 131, sports: ['RUNNING'] }],
    };
    const existingZoneB = {
      trainingZoneId: 2,
      athleteId: 10,
      type: TrainingZoneType.HEARTRATE,
      values: [{ min: 132, max: 142, sports: ['RUNNING'] }],
    };

    it('creates, updates and deletes zones in a single transaction, reassigning index by order', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany
        .mockResolvedValueOnce([existingZoneA, existingZoneB]) // existing zones lookup
        .mockResolvedValueOnce([existingZoneA]); // final re-fetch

      await service.replaceForType(COACH_USER, 10, TrainingZoneType.HEARTRATE, {
        zones: [
          {
            trainingZoneId: 1,
            name: 'Zone 1 renamed',
            description: '',
            color: '#fff',
            values: [{ min: 0, max: 130, sports: [SPORT_TYPE.RUNNING] }],
          },
          {
            name: 'New zone',
            description: '',
            color: '#000',
            values: [{ min: 200, max: 210, sports: [SPORT_TYPE.RUNNING] }],
          },
        ],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      // Zone B was dropped from the payload -> deleted
      expect(prisma.trainingZone.deleteMany).toHaveBeenCalledWith({
        where: { trainingZoneId: { in: [2] } },
      });
      // Zone A kept -> updated with index 0
      expect(prisma.trainingZone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { trainingZoneId: 1 },
          data: expect.objectContaining({ index: 0 }),
        }),
      );
      // New zone created with index 1
      expect(prisma.trainingZone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            index: 1,
            athleteId: 10,
            type: TrainingZoneType.HEARTRATE,
          }),
        }),
      );
    });

    it('rejects when two submitted zones overlap for a shared sport', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([]);

      await expect(
        service.replaceForType(COACH_USER, 10, TrainingZoneType.HEARTRATE, {
          zones: [
            {
              name: 'Zone 1',
              description: '',
              color: '#fff',
              values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
            },
            {
              name: 'Zone 2',
              description: '',
              color: '#000',
              values: [{ min: 130, max: 160, sports: [SPORT_TYPE.RUNNING] }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a trainingZoneId that does not belong to this athlete/type', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.trainingZone.findMany.mockResolvedValue([existingZoneA]);

      await expect(
        service.replaceForType(COACH_USER, 10, TrainingZoneType.HEARTRATE, {
          zones: [
            {
              trainingZoneId: 999,
              name: 'Zone X',
              description: '',
              color: '#fff',
              values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects when the user is not allowed to update the athlete', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.replaceForType(
          UNRELATED_COACH_USER,
          10,
          TrainingZoneType.HEARTRATE,
          {
            zones: [
              {
                name: 'Zone 1',
                description: '',
                color: '#fff',
                values: [{ min: 0, max: 140, sports: [SPORT_TYPE.RUNNING] }],
              },
            ],
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

describe('trainingZoneValueDtoSchema', () => {
  it('accepts a value where min < max', () => {
    const result = trainingZoneValueDtoSchema.safeParse({
      min: 0,
      max: 10,
      sports: ['RUNNING'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a value where min >= max', () => {
    const result = trainingZoneValueDtoSchema.safeParse({
      min: 10,
      max: 10,
      sports: ['RUNNING'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a value with an empty sports array', () => {
    const result = trainingZoneValueDtoSchema.safeParse({
      min: 0,
      max: 10,
      sports: [],
    });
    expect(result.success).toBe(false);
  });
});
