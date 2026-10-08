import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  METERS_PER_MILE,
  distanceFromPace,
  formatDistance,
  formatDuration,
  formatNumber,
  formatPace,
  paceFromTime,
  pacePerKmToPerMile,
  paceToSpeedKmh,
  timeFromPace,
} from '@/utils/running-calculator';

import {
  DistancePicker,
  DurationInput,
  Field,
  PaceInput,
  Segmented,
} from '../calculator-inputs';
import {
  EmptyResult,
  HeroStat,
  Panel,
  ResetButton,
  ResultHero,
  ToolLayout,
} from '../calculator-ui';
import { num, str, useToolState } from '../use-tool-state';

type Target = 'time' | 'pace' | 'distance';

const DEFAULTS = { target: 'time', d: '10000', t: '', p: '270' };

export function PaceTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch, reset] = useToolState('pace', DEFAULTS);
  const target = state.target as Target;
  const distance = num(state.d);
  const time = num(state.t);
  const pace = num(state.p);

  let resultDistance = distance;
  let resultTime = time;
  let resultPace = pace;
  if (target === 'time') resultTime = timeFromPace(distance ?? 0, pace ?? 0);
  if (target === 'pace') resultPace = paceFromTime(distance ?? 0, time ?? 0);
  if (target === 'distance') {
    resultDistance = distanceFromPace(time ?? 0, pace ?? 0);
  }

  const ready =
    resultDistance !== null && resultTime !== null && resultPace !== null;
  const unitPace = unit === 'mi' ? pacePerKmToPerMile(resultPace) : resultPace;
  const otherPace = unit === 'mi' ? resultPace : pacePerKmToPerMile(resultPace);
  const speed = paceToSpeedKmh(resultPace);

  const hero = (() => {
    if (!ready) return null;
    if (target === 'time') {
      return { value: formatDuration(resultTime), unit: undefined };
    }
    if (target === 'pace') {
      return { value: formatPace(unitPace), unit: `/${unit}` };
    }
    const value =
      unit === 'mi'
        ? formatNumber((resultDistance as number) / METERS_PER_MILE, 2)
        : formatNumber((resultDistance as number) / 1000, 2);
    return { value, unit };
  })();

  const targetLabel: Record<Target, string> = {
    time: m.calc_time(),
    pace: m.calc_pace(),
    distance: m.calc_distance(),
  };

  return (
    <ToolLayout
      resultsFirstOnMobile
      inputs={
        <Panel
          title={m.calc_pace_title()}
          description={m.calc_pace_description()}
          action={<ResetButton onClick={reset} />}
        >
          <Field label={m.calc_i_want_to_compute()}>
            <Segmented
              value={target}
              onChange={(value) => patch({ target: value })}
              options={(['time', 'pace', 'distance'] as Target[]).map(
                (value) => ({ value, label: targetLabel[value] }),
              )}
              aria-label={m.calc_i_want_to_compute()}
            />
          </Field>

          {target !== 'distance' && (
            <Field label={m.calc_distance()} htmlFor="pace-distance">
              <DistancePicker
                id="pace-distance"
                value={distance}
                onChange={(v) => patch({ d: str(v) })}
                unit={unit}
              />
            </Field>
          )}
          {target !== 'time' && (
            <Field label={m.calc_time()} htmlFor="pace-time">
              <DurationInput
                id="pace-time"
                value={time}
                onChange={(v) => patch({ t: str(v) })}
                aria-label={m.calc_time()}
              />
            </Field>
          )}
          {target !== 'pace' && (
            <Field label={m.calc_pace()} htmlFor="pace-pace">
              <PaceInput
                id="pace-pace"
                value={pace}
                onChange={(v) => patch({ p: str(v) })}
                unit={unit}
              />
            </Field>
          )}
        </Panel>
      }
      results={
        hero ? (
          <ResultHero
            label={targetLabel[target]}
            value={hero.value}
            unit={hero.unit}
            sub={
              target === 'distance'
                ? undefined
                : `${formatDistance(resultDistance as number, unit)} · ${formatDuration(resultTime)}`
            }
          >
            <HeroStat
              label={m.calc_pace()}
              value={formatPace(unitPace)}
              unit={`/${unit}`}
            />
            <HeroStat
              label={m.calc_pace()}
              value={formatPace(otherPace)}
              unit={unit === 'mi' ? '/km' : '/mi'}
            />
            <HeroStat
              label={m.calc_speed()}
              value={formatNumber(speed, 1)}
              unit="km/h"
            />
            <HeroStat
              label={m.calc_per_400m()}
              value={formatDuration(((resultPace as number) * 400) / 1000)}
            />
          </ResultHero>
        ) : (
          <EmptyResult>{m.calc_fill_two_fields()}</EmptyResult>
        )
      }
    />
  );
}
