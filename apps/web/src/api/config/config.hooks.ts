import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { ConnectorProvider } from '@openathlete/shared';

import { ConfigAPI } from './config.api';
import { configKeys } from './config.keys';

export const useAppConfigQuery = (
  opt?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof ConfigAPI.getConfig>>>,
    'queryKey' | 'queryFn'
  >,
) =>
  useQuery({
    ...opt,
    queryFn: ConfigAPI.getConfig,
    queryKey: [configKeys.getConfig],
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

/** All connector providers this app knows how to render a UI for. */
export const ALL_CONNECTOR_PROVIDERS: ConnectorProvider[] = [
  'STRAVA',
  'GARMIN',
  'SUUNTO',
  'POLAR',
];

/**
 * Connector providers the server actually has credentials configured for.
 * Empty (not `ALL_CONNECTOR_PROVIDERS`) while the config hasn't loaded yet,
 * so nothing unconfigured flashes on screen before the check resolves.
 */
export const useConfiguredConnectorProviders = (): ConnectorProvider[] => {
  const { data } = useAppConfigQuery();
  if (!data) return [];
  return ALL_CONNECTOR_PROVIDERS.filter((provider) => {
    switch (provider) {
      case 'STRAVA':
        return data.connectors.strava;
      case 'GARMIN':
        return data.connectors.garmin;
      case 'SUUNTO':
        return data.connectors.suunto;
      case 'POLAR':
        return data.connectors.polar;
      default:
        return false;
    }
  });
};
