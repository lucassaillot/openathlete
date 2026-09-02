import client, { routes } from '@/utils/axios';

import {
  AthleteInjury,
  CreateInjuryDto,
  UpdateInjuryDto,
} from '@openathlete/shared';

export class InjuryAPI {
  static async getInjuries(athleteId?: number): Promise<AthleteInjury[]> {
    const res = await client.get(routes.injury.getInjuries, {
      params: athleteId ? { athleteId } : undefined,
    });
    return res.data;
  }

  static async create(body: CreateInjuryDto): Promise<AthleteInjury> {
    const res = await client.post(routes.injury.create, body);
    return res.data;
  }

  static async update(
    athleteInjuryId: number,
    body: UpdateInjuryDto,
  ): Promise<AthleteInjury> {
    const res = await client.patch(routes.injury.update(athleteInjuryId), body);
    return res.data;
  }

  static async delete(athleteInjuryId: number): Promise<{ success: boolean }> {
    const res = await client.delete(routes.injury.delete(athleteInjuryId));
    return res.data;
  }
}
