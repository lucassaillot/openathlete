import { useGetMyAthleteQuery } from '@/api/athlete';
import { useGetRecordsQuery } from '@/api/record';
import { PRESET_DISTANCES } from '@/utils/running-calculator';
import { useMemo } from 'react';

import { RECORD_TYPE, SPORT_TYPE } from '@openathlete/shared';

/** Best running time per standard distance, from the athlete's records. */
export function useRunningBests() {
  const { data: athlete } = useGetMyAthleteQuery();
  const { data: records } = useGetRecordsQuery(
    SPORT_TYPE.RUNNING,
    athlete?.athleteId,
  );
  return useMemo(() => {
    const bests: { key: string; meters: number; seconds: number }[] = [];
    if (!records) return bests;
    PRESET_DISTANCES.filter((p) => p.meters >= 1000).forEach((preset) => {
      const candidates = records.filter(
        (r) =>
          r.type === RECORD_TYPE.SPEED &&
          r.value > 0 &&
          Math.abs(r.distance - preset.meters) <
            Math.max(5, preset.meters * 0.002),
      );
      if (candidates.length === 0) return;
      const best = candidates.reduce((a, b) => (b.value > a.value ? b : a));
      bests.push({
        key: preset.key,
        meters: preset.meters,
        seconds: best.distance / best.value,
      });
    });
    return bests;
  }, [records]);
}
