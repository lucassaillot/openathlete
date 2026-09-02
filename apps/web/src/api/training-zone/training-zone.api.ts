import client, { routes } from '@/utils/axios';

import {
  CreateTrainingZoneDto,
  ReplaceTrainingZoneItemDto,
  TRAINING_ZONE_TYPE,
  TrainingZone,
  TrainingZoneValue,
  UpdateTrainingZoneDto,
} from '@openathlete/shared';

type TrainingZoneWithValues = TrainingZone & { values: TrainingZoneValue[] };

export class TrainingZoneAPI {
  static async getAllForAthlete(
    athleteId: number,
  ): Promise<TrainingZoneWithValues[]> {
    const res = await client.get(
      routes.trainingZone.getAllForAthlete(athleteId),
    );
    return res.data;
  }

  static async create(
    body: CreateTrainingZoneDto,
  ): Promise<TrainingZoneWithValues> {
    const res = await client.post(routes.trainingZone.create, body);
    return res.data;
  }

  static async update(
    trainingZoneId: number,
    body: UpdateTrainingZoneDto,
  ): Promise<TrainingZoneWithValues> {
    const res = await client.patch(
      routes.trainingZone.update(trainingZoneId),
      body,
    );
    return res.data;
  }

  static async delete(trainingZoneId: number): Promise<{ success: boolean }> {
    const res = await client.delete(routes.trainingZone.delete(trainingZoneId));
    return res.data;
  }

  static async replaceForType(
    athleteId: number,
    type: TRAINING_ZONE_TYPE,
    zones: ReplaceTrainingZoneItemDto[],
  ): Promise<TrainingZoneWithValues[]> {
    const res = await client.put(
      routes.trainingZone.replaceForType(athleteId, type),
      { zones },
    );
    return res.data;
  }
}
