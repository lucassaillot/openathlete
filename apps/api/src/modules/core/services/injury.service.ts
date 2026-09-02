import { subject } from '@casl/ability';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Athlete } from '@openathlete/database';
import {
  AthleteInjury,
  CreateInjuryDto,
  INJURY_STATUS,
  UpdateInjuryDto,
} from '@openathlete/shared';

import { CaslAbilityFactory } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

@Injectable()
export class InjuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: CaslAbilityFactory,
  ) {}

  /**
   * Get all injuries for the authenticated user or specific athlete
   */
  async getInjuries(
    user: AuthUser,
    athleteId?: Athlete['athleteId'],
  ): Promise<AthleteInjury[]> {
    const ability = await this.abilities.getFor({ user });

    // Determine which athlete's injuries to fetch
    let targetAthleteId: number;

    if (athleteId) {
      // Check if user can access this athlete's data
      const athlete = await this.prisma.athlete.findUnique({
        where: { athleteId: athleteId },
      });

      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }

      if (!ability.can('read', subject('Athlete', athlete))) {
        throw new ForbiddenException('Not allowed to access this athlete');
      }

      targetAthleteId = athleteId;
    } else {
      // Use current user's athlete ID
      const athlete = await this.prisma.athlete.findFirst({
        where: {
          user: {
            userId: user.userId,
          },
        },
        select: {
          athleteId: true,
        },
      });

      if (!athlete) {
        throw new NotFoundException('Athlete not found');
      }

      targetAthleteId = athlete.athleteId;
    }

    const injuries = await this.prisma.athleteInjury.findMany({
      where: {
        athleteId: targetAthleteId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Map Prisma injury_status to shared INJURY_STATUS enum
    const mappedInjuries = injuries.map((injury) => ({
      ...injury,
      status: injury.status as INJURY_STATUS,
    }));

    return mappedInjuries;
  }

  /**
   * Manually create an injury for an athlete. The athlete themselves or one
   * of their coaches may do this. Automatically-extracted injuries (from
   * activity feedback) are created directly by the extraction listener and
   * are unaffected by this method.
   */
  async create(user: AuthUser, dto: CreateInjuryDto): Promise<AthleteInjury> {
    const ability = await this.abilities.getFor({ user });
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: dto.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    const injury = await this.prisma.athleteInjury.create({
      data: {
        athleteId: dto.athleteId,
        location: dto.location,
        painScore: dto.painScore,
        context: dto.context,
        status: dto.status,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
      },
    });

    return { ...injury, status: injury.status as INJURY_STATUS };
  }

  async update(
    user: AuthUser,
    athleteInjuryId: number,
    dto: UpdateInjuryDto,
  ): Promise<AthleteInjury> {
    const ability = await this.abilities.getFor({ user });
    const existing = await this.prisma.athleteInjury.findUnique({
      where: { athleteInjuryId },
    });
    if (!existing) throw new NotFoundException('Injury not found');
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: existing.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    const finalStartDate = dto.startDate ?? existing.startDate;
    let finalEndDate =
      dto.endDate !== undefined ? dto.endDate : existing.endDate;

    // Marking an injury as resolved without explicitly providing an end
    // date automatically closes it as of today.
    if (
      dto.status === INJURY_STATUS.RESOLVED &&
      dto.endDate === undefined &&
      !existing.endDate
    ) {
      finalEndDate = new Date();
    }

    if (finalEndDate && finalStartDate > finalEndDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const updated = await this.prisma.athleteInjury.update({
      where: { athleteInjuryId },
      data: {
        location: dto.location,
        painScore: dto.painScore,
        context: dto.context,
        status: dto.status,
        startDate: dto.startDate,
        endDate: finalEndDate,
      },
    });

    return { ...updated, status: updated.status as INJURY_STATUS };
  }

  async delete(
    user: AuthUser,
    athleteInjuryId: number,
  ): Promise<{ success: boolean }> {
    const ability = await this.abilities.getFor({ user });
    const existing = await this.prisma.athleteInjury.findUnique({
      where: { athleteInjuryId },
    });
    if (!existing) throw new NotFoundException('Injury not found');
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: existing.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    await this.prisma.athleteInjury.delete({ where: { athleteInjuryId } });
    return { success: true };
  }
}
