import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  type PaceRange,
  danielsPaces,
  formatDuration,
  formatNumber,
  formatPace,
  intervalTime,
  pacePerKmToPerMile,
  paceToSpeedKmh,
  vdotFromPerformance,
  vmaFromVdot,
  vmaZones,
} from '@/utils/running-calculator';

import {
  Chip,
  DistancePicker,
  DurationInput,
  Field,
  NumberInput,
  Segmented,
} from '../calculator-inputs';
import {
  EmptyResult,
  HeroStat,
  Panel,
  ResetButton,
  ResultHero,
  Stat,
  ToolLayout,
  ZoneRow,
} from '../calculator-ui';
import { num, str, useToolState } from '../use-tool-state';
import { RecordChips } from './predictor-tool';

type Source = 'vma' | 'perf';

const DEFAULTS = {
  src: 'vma',
  vma: '16',
  rd: '10000',
  rt: '2700',
  reps: '10',
  rep: '400',
  pct: '95',
};

const REP_DISTANCES = [200, 300, 400, 500, 800, 1000, 1600, 2000];

const VMA_ZONE_LABELS: Record<string, () => { name: string; desc: string }> = {
  recovery: () => ({
    name: m.calc_zone_recovery(),
    desc: m.calc_zone_recovery_desc(),
  }),
  endurance: () => ({
    name: m.calc_zone_endurance(),
    desc: m.calc_zone_endurance_desc(),
  }),
  active: () => ({
    name: m.calc_zone_active(),
    desc: m.calc_zone_active_desc(),
  }),
  threshold: () => ({
    name: m.calc_zone_threshold(),
    desc: m.calc_zone_threshold_desc(),
  }),
  long_intervals: () => ({
    name: m.calc_zone_long_intervals(),
    desc: m.calc_zone_long_intervals_desc(),
  }),
  short_intervals: () => ({
    name: m.calc_zone_short_intervals(),
    desc: m.calc_zone_short_intervals_desc(),
  }),
  sprint: () => ({
    name: m.calc_zone_sprint(),
    desc: m.calc_zone_sprint_desc(),
  }),
};

const DANIELS_LABELS: Record<string, () => { name: string; desc: string }> = {
  E: () => ({ name: m.calc_daniels_e(), desc: m.calc_daniels_e_desc() }),
  M: () => ({ name: m.calc_daniels_m(), desc: m.calc_daniels_m_desc() }),
  T: () => ({ name: m.calc_daniels_t(), desc: m.calc_daniels_t_desc() }),
  I: () => ({ name: m.calc_daniels_i(), desc: m.calc_daniels_i_desc() }),
  R: () => ({ name: m.calc_daniels_r(), desc: m.calc_daniels_r_desc() }),
};

const VMA_PERCENT: Record<string, string> = {
  recovery: '50–60 %',
  endurance: '60–70 %',
  active: '70–80 %',
  threshold: '80–90 %',
  long_intervals: '90–95 %',
  short_intervals: '95–105 %',
  sprint: '105–120 %',
};

export function TrainingTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch, reset] = useToolState('training', DEFAULTS);
  const source = state.src as Source;
  const distance = num(state.rd);
  const time = num(state.rt);
  const vdot =
    source === 'perf' && distance && time
      ? vdotFromPerformance(distance, time)
      : null;
  const vma =
    source === 'vma' ? num(state.vma) : vdot ? vmaFromVdot(vdot) : null;
  const validVma = vma !== null && vma >= 6 && vma <= 30 ? vma : null;

  const zones: PaceRange[] =
    source === 'perf'
      ? vdot && vdot > 15
        ? danielsPaces(vdot)
        : []
      : validVma
        ? vmaZones(validVma)
        : [];

  const displayPace = (p: number | null) =>
    formatPace(unit === 'mi' ? pacePerKmToPerMile(p) : p);

  const rangeLabel = (z: PaceRange) =>
    Math.abs(z.slow - z.fast) < 1
      ? displayPace(z.fast)
      : `${displayPace(z.slow)} – ${displayPace(z.fast)}`;

  const speedLabel = (z: PaceRange) => {
    const slow = paceToSpeedKmh(z.slow);
    const fast = paceToSpeedKmh(z.fast);
    return Math.abs(z.slow - z.fast) < 1
      ? `${formatNumber(fast, 1)} km/h`
      : `${formatNumber(slow, 1)} – ${formatNumber(fast, 1)} km/h`;
  };

  // Interval helper
  const reps = num(state.reps) ?? 0;
  const repDistance = num(state.rep) ?? 0;
  const pct = num(state.pct) ?? 0;
  const repTime =
    validVma && repDistance ? intervalTime(repDistance, validVma, pct) : null;

  return (
    <ToolLayout
      inputs={
        <>
          <Panel
            title={m.calc_training_title()}
            description={m.calc_training_description()}
            action={<ResetButton onClick={reset} />}
          >
            <Field label={m.calc_based_on()}>
              <Segmented
                value={source}
                onChange={(value) => patch({ src: value })}
                options={[
                  { value: 'vma', label: m.calc_my_vma() },
                  { value: 'perf', label: m.calc_a_race() },
                ]}
              />
            </Field>

            {source === 'vma' ? (
              <Field
                label={m.calc_vma()}
                htmlFor="training-vma"
                hint={m.calc_vma_hint()}
              >
                <NumberInput
                  id="training-vma"
                  value={state.vma}
                  onChange={(v) => patch({ vma: v })}
                  suffix="km/h"
                  placeholder="16"
                />
              </Field>
            ) : (
              <>
                <RecordChips
                  distance={distance}
                  time={time}
                  onPick={(meters, seconds) =>
                    patch({ rd: str(meters), rt: str(seconds) })
                  }
                />
                <Field
                  label={m.calc_reference_distance()}
                  htmlFor="training-distance"
                >
                  <DistancePicker
                    id="training-distance"
                    value={distance}
                    onChange={(v) => patch({ rd: str(v) })}
                    unit={unit}
                    presets={['3k', '5k', '10k', 'half', 'marathon']}
                  />
                </Field>
                <Field label={m.calc_reference_time()}>
                  <DurationInput
                    value={time}
                    onChange={(v) => patch({ rt: str(v) })}
                    aria-label={m.calc_reference_time()}
                  />
                </Field>
              </>
            )}
          </Panel>

          <Panel
            title={m.calc_interval_title()}
            description={m.calc_interval_description()}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label={m.calc_reps()}>
                <NumberInput
                  value={state.reps}
                  onChange={(v) => patch({ reps: v })}
                  suffix="×"
                />
              </Field>
              <Field label={m.calc_percent_vma()}>
                <NumberInput
                  value={state.pct}
                  onChange={(v) => patch({ pct: v })}
                  suffix="%"
                />
              </Field>
            </div>
            <Field label={m.calc_rep_distance()}>
              <NumberInput
                value={state.rep}
                onChange={(v) => patch({ rep: v })}
                suffix="m"
              />
              <div className="flex flex-wrap gap-1.5">
                {REP_DISTANCES.map((d) => (
                  <Chip
                    key={d}
                    active={repDistance === d}
                    onClick={() => patch({ rep: String(d) })}
                    className="h-8 px-3 text-xs"
                  >
                    {d} m
                  </Chip>
                ))}
              </div>
            </Field>
            {repTime ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat
                  className="col-span-2 bg-primary/10 sm:col-span-1"
                  label={m.calc_per_rep()}
                  value={formatDuration(repTime, { decimals: repTime < 120 })}
                />
                <Stat
                  label={m.calc_pace()}
                  value={displayPace(repTime / (repDistance / 1000))}
                  unit={`/${unit}`}
                />
                <Stat
                  label={m.calc_total()}
                  value={formatNumber((reps * repDistance) / 1000, 1)}
                  unit="km"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {m.calc_interval_needs_vma()}
              </p>
            )}
          </Panel>
        </>
      }
      results={
        zones.length > 0 ? (
          <>
            <ResultHero
              label={source === 'perf' ? 'VDOT' : m.calc_vma()}
              value={formatNumber(source === 'perf' ? vdot : validVma, 1)}
              unit={source === 'perf' ? undefined : 'km/h'}
              info={
                source === 'perf'
                  ? m.calc_daniels_info()
                  : m.calc_vma_zones_info()
              }
            >
              {source === 'perf' && (
                <HeroStat
                  label={m.calc_estimated_vma()}
                  value={formatNumber(validVma, 1)}
                  unit="km/h"
                />
              )}
              <HeroStat
                label={m.calc_vma_pace()}
                value={displayPace(validVma ? 3600 / validVma : null)}
                unit={`/${unit}`}
              />
              <HeroStat
                label="VO2max ≈"
                value={formatNumber(
                  source === 'perf' ? vdot : validVma ? validVma * 3.5 : null,
                  0,
                )}
              />
            </ResultHero>
            <Panel
              title={m.calc_training_zones()}
              description={
                source === 'perf'
                  ? m.calc_daniels_zones_desc()
                  : m.calc_vma_zones_desc()
              }
            >
              <ul className="-my-3 flex flex-col divide-y">
                {zones.map((z, i) => {
                  const labels =
                    source === 'perf'
                      ? DANIELS_LABELS[z.key]()
                      : VMA_ZONE_LABELS[z.key]();
                  const showSplits = source === 'perf' ? i >= 2 : i >= 3;
                  return (
                    <ZoneRow
                      key={z.key}
                      colorIndex={source === 'perf' ? [1, 2, 3, 5, 6][i] : i}
                      name={
                        source === 'perf'
                          ? `${z.key} · ${labels.name}`
                          : labels.name
                      }
                      description={
                        source === 'perf'
                          ? labels.desc
                          : `${VMA_PERCENT[z.key]} · ${labels.desc}`
                      }
                      value={
                        <>
                          {rangeLabel(z)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            /{unit}
                          </span>
                        </>
                      }
                      secondary={
                        showSplits
                          ? `${speedLabel(z)} · 400 m ${formatDuration((z.fast * 400) / 1000)} · 1000 m ${formatDuration(z.fast)}`
                          : speedLabel(z)
                      }
                    />
                  );
                })}
              </ul>
            </Panel>
          </>
        ) : (
          <EmptyResult>
            {source === 'vma' ? m.calc_fill_vma() : m.calc_fill_reference()}
          </EmptyResult>
        )
      }
    />
  );
}
