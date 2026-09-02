import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { INJURY_STATUS } from '@openathlete/shared';

import { CaslAbilityFactory } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { InjuryService } from './injury.service';

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
  const prisma = {
    athlete: { findUnique: jest.fn() },
    athleteInjury: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return prisma as unknown as PrismaService & {
    athlete: { findUnique: jest.Mock };
    athleteInjury: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
}

describe('InjuryService', () => {
  let service: InjuryService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let abilities: { getFor: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    abilities = { getFor: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InjuryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CaslAbilityFactory, useValue: abilities },
      ],
    }).compile();

    service = moduleRef.get(InjuryService);
  });

  describe('getInjuries (existing read path — regression guard)', () => {
    it('still returns the athlete injuries ordered by updatedAt desc without needing new fields', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.findMany.mockResolvedValue([
        { athleteInjuryId: 1, status: 'STABLE' },
      ]);

      const result = await service.getInjuries(COACH_USER, 10);

      expect(result).toEqual([{ athleteInjuryId: 1, status: 'STABLE' }]);
      expect(prisma.athleteInjury.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { athleteId: 10 },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    const validDto = {
      athleteId: 10,
      location: 'genou gauche',
      painScore: 0.3,
      context: 'Douleur en descente',
      status: INJURY_STATUS.STABLE,
      startDate: new Date('2026-09-01'),
    };

    it('creates an injury when the coach manages the athlete', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.create.mockResolvedValue({
        athleteInjuryId: 1,
        ...validDto,
        endDate: null,
        sourceActivityId: null,
      });

      const result = await service.create(COACH_USER, validDto);

      expect(prisma.athleteInjury.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            athleteId: 10,
            location: 'genou gauche',
            endDate: null,
          }),
        }),
      );
      expect(result.athleteInjuryId).toBe(1);
    });

    it('rejects when the coach does not manage this athlete', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.create(UNRELATED_COACH_USER, validDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.athleteInjury.create).not.toHaveBeenCalled();
    });

    it('allows the athlete to create their own injury', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.create.mockResolvedValue({
        athleteInjuryId: 2,
        ...validDto,
        endDate: null,
        sourceActivityId: null,
      });

      await expect(service.create(ATHLETE_USER, validDto)).resolves.toEqual(
        expect.objectContaining({ athleteInjuryId: 2 }),
      );
    });

    it('automatically closes an injury created as resolved', async () => {
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.create.mockResolvedValue({
        athleteInjuryId: 3,
        ...validDto,
        status: INJURY_STATUS.RESOLVED,
        endDate: new Date(),
      });

      await service.create(COACH_USER, {
        ...validDto,
        status: INJURY_STATUS.RESOLVED,
      });

      const callArg = prisma.athleteInjury.create.mock.calls[0][0];
      expect(callArg.data.endDate).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when the athlete does not exist', async () => {
      prisma.athlete.findUnique.mockResolvedValue(null);

      await expect(service.create(COACH_USER, validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fields when authorized', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-01'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.update.mockResolvedValue({
        athleteInjuryId: 1,
        status: 'IMPROVING',
      });

      await service.update(COACH_USER, 1, { status: INJURY_STATUS.IMPROVING });

      expect(prisma.athleteInjury.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { athleteInjuryId: 1 },
          data: expect.objectContaining({ status: INJURY_STATUS.IMPROVING }),
        }),
      );
    });

    it('rejects when not authorized', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-01'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.update(UNRELATED_COACH_USER, 1, {
          status: INJURY_STATUS.RESOLVED,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the injury does not exist', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue(null);

      await expect(
        service.update(COACH_USER, 999, { status: INJURY_STATUS.RESOLVED }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the merged startDate is after endDate', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-10'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));

      await expect(
        service.update(COACH_USER, 1, { endDate: new Date('2026-09-01') }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.athleteInjury.update).not.toHaveBeenCalled();
    });

    it('automatically sets endDate to today when marked resolved without an explicit endDate', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-01'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.update.mockResolvedValue({});

      await service.update(COACH_USER, 1, { status: INJURY_STATUS.RESOLVED });

      const callArg = prisma.athleteInjury.update.mock.calls[0][0];
      expect(callArg.data.endDate).toBeInstanceOf(Date);
    });

    it('automatically sets endDate when marked resolved with an explicit null endDate', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-01'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.update.mockResolvedValue({});

      await service.update(COACH_USER, 1, {
        status: INJURY_STATUS.RESOLVED,
        endDate: null,
      });

      const callArg = prisma.athleteInjury.update.mock.calls[0][0];
      expect(callArg.data.endDate).toBeInstanceOf(Date);
    });

    it('does not override an already-explicit endDate when resolving', async () => {
      const explicitEnd = new Date('2026-09-05');
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
        status: 'STABLE',
        startDate: new Date('2026-09-01'),
        endDate: null,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));
      prisma.athleteInjury.update.mockResolvedValue({});

      await service.update(COACH_USER, 1, {
        status: INJURY_STATUS.RESOLVED,
        endDate: explicitEnd,
      });

      const callArg = prisma.athleteInjury.update.mock.calls[0][0];
      expect(callArg.data.endDate).toEqual(explicitEnd);
    });
  });

  describe('delete', () => {
    it('deletes when authorized', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(true));

      const result = await service.delete(COACH_USER, 1);

      expect(prisma.athleteInjury.delete).toHaveBeenCalledWith({
        where: { athleteInjuryId: 1 },
      });
      expect(result).toEqual({ success: true });
    });

    it('rejects when not authorized', async () => {
      prisma.athleteInjury.findUnique.mockResolvedValue({
        athleteInjuryId: 1,
        athleteId: 10,
      });
      prisma.athlete.findUnique.mockResolvedValue({ athleteId: 10 });
      abilities.getFor.mockResolvedValue(makeAbility(false));

      await expect(
        service.delete(UNRELATED_COACH_USER, 1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.athleteInjury.delete).not.toHaveBeenCalled();
    });
  });
});
