import { useGetMyAthleteQuery } from '@/api/athlete';
import { useGetLatestMetricsQuery } from '@/api/metric/metric.hooks';
import { useGetTrainingZones } from '@/api/training-zone';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { metricTypeLabelMap } from '@/utils/label-map/core/metric-type.label-map';
import { cn } from '@/utils/shadcn';
import { getTargetTypeLabel } from '@/utils/workout';
import { useMemo } from 'react';

import type { WorkoutStepTargetDto } from '@openathlete/shared';
import { SPORT_TYPE, formatTarget } from '@openathlete/shared';

interface TargetBadgeProps {
  target: WorkoutStepTargetDto;
  className?: string;
  showTooltip?: boolean;
  sport?: SPORT_TYPE;
  athleteId?: number;
  showAbsoluteValues?: boolean;
}

export function TargetBadge({
  target,
  className,
  showTooltip = true,
  sport,
  athleteId,
  showAbsoluteValues = false,
}: TargetBadgeProps) {
  const { data: athlete } = useGetMyAthleteQuery({ enabled: !athleteId });
  const effectiveAthleteId = athleteId ?? athlete?.athleteId;
  const { data: trainingZones } = useGetTrainingZones(effectiveAthleteId ?? 0, {
    enabled: !!effectiveAthleteId,
  });
  const { data: latestMetrics = {} } = useGetLatestMetricsQuery(
    showAbsoluteValues ? effectiveAthleteId : undefined,
  );

  // Convert metrics format from Record<string, AthleteMetric> to Record<string, { value: number }>
  const metricsForFormat = useMemo(() => {
    const converted: Record<string, { value: number }> = {};
    Object.entries(latestMetrics).forEach(([key, metric]) => {
      if (metric && typeof metric === 'object' && 'value' in metric) {
        converted[key] = { value: metric.value };
      }
    });
    return converted;
  }, [latestMetrics]);

  const formatted = useMemo(() => {
    return formatTarget(
      target,
      (metricType) => {
        return (
          metricTypeLabelMap[metricType as keyof typeof metricTypeLabelMap] ||
          metricType
        );
      },
      showAbsoluteValues ? metricsForFormat : undefined,
      trainingZones || [],
      sport,
    );
  }, [target, metricsForFormat, showAbsoluteValues, trainingZones, sport]);

  const label = getTargetTypeLabel(target.targetType);

  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        className,
      )}
    >
      {formatted}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            <span className="font-medium">{label}:</span> {formatted}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
