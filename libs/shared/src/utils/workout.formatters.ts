import { TrainingZone, TrainingZoneValue } from '../entities';
import { WorkoutStepTargetDto } from '../types';
import { SPORT_TYPE } from '../types/misc';
import { formatSpeed } from './numeric-stats.formatter';
import { formatPaceLabel } from './pace-format.util';
import { getTargetIntensity } from './target-intensity';

export type TrainingZoneWithValues = TrainingZone & {
  values: TrainingZoneValue[];
};

function formatZoneRange(
  zone: TrainingZoneWithValues,
  sport?: SPORT_TYPE,
): string | null {
  const value =
    zone.values.find(
      (v) => v.sports.length === 0 || (sport && v.sports.includes(sport)),
    ) ?? zone.values[0];
  if (!value) return null;

  switch (zone.type) {
    case 'PACE':
      return `${formatPaceLabel(value.min)} - ${formatPaceLabel(value.max)} /km`;
    case 'POWER':
      return `${value.min} - ${value.max} W`;
    case 'HEARTRATE':
    default:
      return `${value.min} - ${value.max} bpm`;
  }
}

/**
 * Format a workout target for display
 * @param target - Target object with type, unit, and values
 * @param getMetricLabel - Optional function to get metric label (for i18n)
 * @param metrics - Optional record of metric types to their values for calculating absolute values
 * @param trainingZones - The athlete's training zones (with values), used to resolve ZONE targets
 * @param sport - The training's sport, used to pick the right per-sport zone value
 * @returns Human-readable formatted target
 */
export function formatTarget(
  target: WorkoutStepTargetDto,
  getMetricLabel?: (metricType: string) => string,
  metrics?: Record<string, { value: number } | number>,
  trainingZones?: TrainingZoneWithValues[],
  sport?: SPORT_TYPE,
): string {
  const { targetType, targetMin, targetMax, targetValue, metricType } = target;

  // Helper to format percentage
  const formatPercent = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  // Helper to get metric label
  const getMetricName = (metric: string | null | undefined): string => {
    if (!metric) return '';
    return getMetricLabel ? getMetricLabel(metric) : metric;
  };

  // Open target (no specific goal)
  if (targetType === 'OPEN') {
    return 'Open';
  }

  if (
    targetType === 'ZONE' &&
    targetValue !== null &&
    targetValue !== undefined
  ) {
    const zone = trainingZones?.find((z) => z.trainingZoneId === targetValue);
    if (zone) {
      const range = formatZoneRange(zone, sport);
      return range ? `${zone.name} — ${range}` : zone.name;
    }
    return `Zone ${targetValue}`;
  }

  // If metricType is set, values are percentages (0-1)
  const isPercentage = !!metricType;
  const metricName = getMetricName(metricType);

  // Range target (min-max)
  if (
    targetMin !== null &&
    targetMin !== undefined &&
    targetMax !== null &&
    targetMax !== undefined
  ) {
    if (isPercentage && metricName) {
      // Get absolute values if metrics are provided
      const absoluteValues = getTargetIntensity(target, metrics);
      const percentageStr = `${formatPercent(targetMin)} - ${formatPercent(targetMax)} de ${metricName}`;

      // Format absolute values based on target type
      if (
        absoluteValues.min !== null &&
        absoluteValues.max !== null &&
        metrics
      ) {
        let absoluteStr = '';
        switch (targetType) {
          case 'PACE':
            absoluteStr = `${formatSpeed(absoluteValues.min)} - ${formatSpeed(absoluteValues.max)} min/km`;
            break;
          case 'HEARTRATE':
            absoluteStr = `${Math.round(absoluteValues.min)} - ${Math.round(absoluteValues.max)} bpm`;
            break;
          case 'POWER':
            absoluteStr = `${Math.round(absoluteValues.min)} - ${Math.round(absoluteValues.max)} W`;
            break;
          case 'CADENCE':
            absoluteStr = `${Math.round(absoluteValues.min)} - ${Math.round(absoluteValues.max)} rpm`;
            break;
          default:
            absoluteStr = `${absoluteValues.min} - ${absoluteValues.max}`;
        }
        return `${percentageStr} - ${absoluteStr}`;
      }

      return percentageStr;
    }

    switch (targetType) {
      case 'PACE': {
        if (targetMin === null || targetMax === null) {
          return 'Open';
        }
        return `${formatSpeed(targetMin)} - ${formatSpeed(targetMax)}`;
      }

      case 'HEARTRATE':
        return `${targetMin} - ${targetMax} bpm`;

      case 'POWER':
        return `${targetMin} - ${targetMax} W`;

      case 'CADENCE':
        return `${targetMin} - ${targetMax} rpm`;

      case 'RPE':
        return `RPE ${targetMin} - ${targetMax}`;

      case 'WEIGHT':
        return `${targetMin} - ${targetMax} kg`;

      default:
        return `${targetMin} - ${targetMax}`;
    }
  }

  // Single value target
  if (targetValue !== null && targetValue !== undefined) {
    if (isPercentage && metricName) {
      // Get absolute value if metrics are provided
      const absoluteValues = getTargetIntensity(target, metrics);
      const percentageStr = `${formatPercent(targetValue)} de ${metricName}`;

      // Format absolute value based on target type
      if (absoluteValues.value !== null && metrics) {
        let absoluteStr = '';
        switch (targetType) {
          case 'PACE':
            absoluteStr = `${formatSpeed(absoluteValues.value)}`;
            break;
          case 'HEARTRATE':
            absoluteStr = `${Math.round(absoluteValues.value)} bpm`;
            break;
          case 'POWER':
            absoluteStr = `${Math.round(absoluteValues.value)} W`;
            break;
          case 'CADENCE':
            absoluteStr = `${Math.round(absoluteValues.value)} rpm`;
            break;
          default:
            absoluteStr = `${absoluteValues.value}`;
        }
        return `${percentageStr} - ${absoluteStr}`;
      }

      return percentageStr;
    }

    switch (targetType) {
      case 'WEIGHT':
        return `${targetValue} kg`;

      case 'PACE': {
        if (targetValue === null) {
          return 'Open';
        }
        return `${formatSpeed(targetValue)} min/km`;
      }

      case 'HEARTRATE':
        return `${targetValue} bpm`;

      case 'POWER':
        return `${targetValue} W`;

      case 'CADENCE':
        return `${targetValue} rpm`;

      case 'RPE':
        return `RPE ${targetValue}`;

      default:
        return `${targetValue}`;
    }
  }

  return 'Open';
}
