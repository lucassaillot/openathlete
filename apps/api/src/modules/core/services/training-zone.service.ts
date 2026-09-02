import { subject } from '@casl/ability';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingZoneType } from '@openathlete/database';
import {
  CreateTrainingZoneDto,
  ReplaceTrainingZonesDto,
  TrainingZoneValueDto,
  UpdateTrainingZoneDto,
} from '@openathlete/shared';

import { CaslAbilityFactory } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

interface SiblingZoneValue {
  trainingZoneId: number;
  zoneName: string;
  min: number;
  max: number;
  sports: string[];
}

@Injectable()
export class TrainingZoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: CaslAbilityFactory,
  ) {}

  async getAllForAthlete(user: AuthUser, athleteId: number) {
    const ability = await this.abilities.getFor({ user });
    // Check access to athlete
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('read', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to access this athlete');
    }
    const zones = await this.prisma.trainingZone.findMany({
      where: { athleteId: athleteId },
      include: { values: true },
      orderBy: { index: 'asc' },
    });
    return zones;
  }

  async create(user: AuthUser, dto: CreateTrainingZoneDto) {
    const ability = await this.abilities.getFor({ user });
    // Check access to athlete
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: dto.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    const siblings = await this.getSiblingValues(dto.athleteId, dto.type);
    this.assertNoOverlap(siblings, dto.values);

    const existingCount = await this.prisma.trainingZone.count({
      where: { athleteId: dto.athleteId, type: dto.type },
    });
    const zone = await this.prisma.trainingZone.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        index: existingCount,
        type: dto.type,
        color: dto.color,
        athleteId: dto.athleteId,
        values: {
          create: dto.values.map((value) => ({
            min: value.min,
            max: value.max,
            sports: value.sports,
          })),
        },
      },
      include: { values: true },
    });
    return zone;
  }

  async update(
    user: AuthUser,
    trainingZoneId: number,
    dto: UpdateTrainingZoneDto,
  ) {
    const ability = await this.abilities.getFor({ user });
    const zone = await this.prisma.trainingZone.findUnique({
      where: { trainingZoneId: trainingZoneId },
      include: { values: true },
    });
    if (!zone) throw new NotFoundException('Training zone not found');
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: zone.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    const siblings = await this.getSiblingValues(
      zone.athleteId,
      zone.type,
      trainingZoneId,
    );
    this.assertNoOverlap(siblings, dto.values);

    const updatedZone = await this.prisma.$transaction(async (tx) => {
      await tx.trainingZoneValue.deleteMany({
        where: { trainingZoneId: trainingZoneId },
      });
      return tx.trainingZone.update({
        where: { trainingZoneId: trainingZoneId },
        data: {
          name: dto.name,
          description: dto.description ?? '',
          color: dto.color,
          values: {
            create: dto.values.map((value) => ({
              min: value.min,
              max: value.max,
              sports: value.sports,
            })),
          },
        },
        include: { values: true },
      });
    });
    return updatedZone;
  }

  async delete(user: AuthUser, trainingZoneId: number) {
    const ability = await this.abilities.getFor({ user });
    const zone = await this.prisma.trainingZone.findUnique({
      where: { trainingZoneId: trainingZoneId },
    });
    if (!zone) throw new NotFoundException('Training zone not found');
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: zone.athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }
    await this.prisma.$transaction([
      this.prisma.trainingZoneValue.deleteMany({
        where: { trainingZoneId: trainingZoneId },
      }),
      this.prisma.trainingZone.delete({
        where: { trainingZoneId: trainingZoneId },
      }),
    ]);
    return { success: true };
  }

  async replaceForType(
    user: AuthUser,
    athleteId: number,
    type: TrainingZoneType,
    dto: ReplaceTrainingZonesDto,
  ) {
    const ability = await this.abilities.getFor({ user });
    const athlete = await this.prisma.athlete.findUnique({
      where: { athleteId: athleteId },
    });
    if (!athlete) throw new NotFoundException('Athlete not found');
    if (!ability.can('update', subject('Athlete', athlete))) {
      throw new ForbiddenException('Not allowed to update this athlete');
    }

    const submittedIds = dto.zones
      .map((zone) => zone.trainingZoneId)
      .filter((id): id is number => id !== undefined);

    const existingZones = await this.prisma.trainingZone.findMany({
      where: { athleteId: athleteId, type: type },
      include: { values: true },
    });
    const existingIds = new Set(existingZones.map((z) => z.trainingZoneId));
    for (const id of submittedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Training zone ${id} does not belong to this athlete/type`,
        );
      }
    }

    this.assertNoOverlapWithinBatch(dto.zones);

    const zonesToDelete = existingZones.filter(
      (z) => !submittedIds.includes(z.trainingZoneId),
    );

    await this.prisma.$transaction(async (tx) => {
      if (zonesToDelete.length > 0) {
        const idsToDelete = zonesToDelete.map((z) => z.trainingZoneId);
        await tx.trainingZoneValue.deleteMany({
          where: { trainingZoneId: { in: idsToDelete } },
        });
        await tx.trainingZone.deleteMany({
          where: { trainingZoneId: { in: idsToDelete } },
        });
      }

      for (let index = 0; index < dto.zones.length; index++) {
        const zone = dto.zones[index];
        if (zone.trainingZoneId) {
          await tx.trainingZoneValue.deleteMany({
            where: { trainingZoneId: zone.trainingZoneId },
          });
          await tx.trainingZone.update({
            where: { trainingZoneId: zone.trainingZoneId },
            data: {
              name: zone.name,
              description: zone.description ?? '',
              color: zone.color,
              index,
              values: {
                create: zone.values.map((value) => ({
                  min: value.min,
                  max: value.max,
                  sports: value.sports,
                })),
              },
            },
          });
        } else {
          await tx.trainingZone.create({
            data: {
              name: zone.name,
              description: zone.description ?? '',
              color: zone.color,
              index,
              type,
              athleteId,
              values: {
                create: zone.values.map((value) => ({
                  min: value.min,
                  max: value.max,
                  sports: value.sports,
                })),
              },
            },
          });
        }
      }
    });

    return this.prisma.trainingZone.findMany({
      where: { athleteId: athleteId, type: type },
      include: { values: true },
      orderBy: { index: 'asc' },
    });
  }

  private async getSiblingValues(
    athleteId: number,
    type: TrainingZoneType,
    excludeTrainingZoneId?: number,
  ): Promise<SiblingZoneValue[]> {
    const siblingZones = await this.prisma.trainingZone.findMany({
      where: {
        athleteId,
        type,
        ...(excludeTrainingZoneId
          ? { trainingZoneId: { not: excludeTrainingZoneId } }
          : {}),
      },
      include: { values: true },
    });
    return siblingZones.flatMap((zone) =>
      zone.values.map((value) => ({
        trainingZoneId: zone.trainingZoneId,
        zoneName: zone.name,
        min: value.min,
        max: value.max,
        sports: value.sports,
      })),
    );
  }

  private assertNoOverlap(
    siblings: SiblingZoneValue[],
    candidateValues: TrainingZoneValueDto[],
  ) {
    for (const candidate of candidateValues) {
      for (const sibling of siblings) {
        const sharesSport = candidate.sports.some((sport) =>
          sibling.sports.includes(sport),
        );
        if (!sharesSport) continue;
        const overlaps =
          candidate.min < sibling.max && sibling.min < candidate.max;
        if (overlaps) {
          throw new BadRequestException(
            `Zone range [${candidate.min}, ${candidate.max}] overlaps with zone "${sibling.zoneName}" [${sibling.min}, ${sibling.max}] for a shared sport`,
          );
        }
      }
    }
  }

  private assertNoOverlapWithinBatch(
    zones: { name: string; values: TrainingZoneValueDto[] }[],
  ) {
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        for (const a of zones[i].values) {
          for (const b of zones[j].values) {
            const sharesSport = a.sports.some((sport) =>
              b.sports.includes(sport),
            );
            if (!sharesSport) continue;
            const overlaps = a.min < b.max && b.min < a.max;
            if (overlaps) {
              throw new BadRequestException(
                `Zone "${zones[i].name}" [${a.min}, ${a.max}] overlaps with zone "${zones[j].name}" [${b.min}, ${b.max}] for a shared sport`,
              );
            }
          }
        }
      }
    }
  }
}
