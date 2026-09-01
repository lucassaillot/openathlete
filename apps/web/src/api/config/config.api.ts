import client, { routes } from '@/utils/axios';

export interface AppConfig {
  connectors: {
    strava: boolean;
    garmin: boolean;
    suunto: boolean;
    coros: boolean;
    polar: boolean;
  };
  ai: boolean;
}

export class ConfigAPI {
  static async getConfig(): Promise<AppConfig> {
    const res = await client.get(routes.app.config);
    return res.data;
  }
}
