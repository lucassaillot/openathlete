import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  PRESET_DISTANCES,
  formatDistance,
  formatDuration,
  formatNumber,
  formatPace,
  pacePerKmToPerMile,
  riegelPredict,
  timeFromVdot,
  vdotFromPerformance,
  vmaFromVdot,
} from '@/utils/running-calculator';
import { Medal } from 'lucide-react';

import {
  Chip,
  DistancePicker,
  DurationInput,
  Field,
  NumberInput,
} from '../calculator-inputs';
import { presetLabel } from '../calculator-labels';
import {
  EmptyResult,
  HeroStat,
  InfoTip,
  Panel,
  ResetButton,
  ResultHero,
  ToolLayout,
} from '../calculator-ui';
import { useRunningBests } from '../use-running-bests';
import { num, str, useToolState } from '../use-tool-state';

const TARGETS = ['1500m', 'mile', '3k', '5k', '10k', '15k', 'half', 'marathon'];

const DEFAULTS = { rd: '10000', rt: '2700', rx: '1.06' };

export function RecordChips({
  onPick,
  distance,
  time,
}: {
  onPick: (meters: number, seconds: number) => void;
  distance: number | null;
  time: number | null;
}) {
  const bests = useRunningBests();
  if (bests.length === 0) return null;
  const isActive = (b: (typeof bests)[number]) =>
    distance !== null &&
    Math.abs(distance - b.meters) < 0.5 &&
    time !== null &&
    Math.abs(time - Math.round(b.seconds)) <= 1;
  const selected = bests.find(isActive)?.key ?? '';
  return (
    <Field label={m.calc_use_my_records()}>
      {/* Mobile: dropdown */}
      <Select
        value={selected}
        onValueChange={(key) => {
          const best = bests.find((b) => b.key === key);
          if (best) onPick(best.meters, Math.round(best.seconds));
        }}
      >
        <SelectTrigger className="h-12 w-full rounded-xl text-base data-[size=default]:h-12 sm:hidden">
          <SelectValue placeholder={m.calc_pick_record()} />
        </SelectTrigger>
        <SelectContent>
          {bests.map((b) => (
            <SelectItem key={b.key} value={b.key} className="h-11 text-base">
              <Medal className="size-4 text-amber-500" />
              {presetLabel(b.key)}
              <span className="tabular-nums text-muted-foreground">
                {formatDuration(b.seconds)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Desktop: chips */}
      <div className="hidden flex-wrap gap-1.5 sm:flex">
        {bests.map((b) => (
          <Chip
            key={b.key}
            active={isActive(b)}
            onClick={() => onPick(b.meters, Math.round(b.seconds))}
          >
            <Medal className="size-3.5 text-amber-500" />
            {presetLabel(b.key)}
            <span className="tabular-nums opacity-70">
              {formatDuration(b.seconds)}
            </span>
          </Chip>
        ))}
      </div>
    </Field>
  );
}

export function PredictorTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch, reset] = useToolState('predictor', DEFAULTS);
  const distance = num(state.rd);
  const time = num(state.rt);
  const exponent = num(state.rx) ?? 1.06;
  const vdot = distance && time ? vdotFromPerformance(distance, time) : null;
  const ready = vdot !== null && vdot > 15 && vdot < 95;

  const displayPace = (p: number | null) =>
    formatPace(unit === 'mi' ? pacePerKmToPerMile(p) : p);

  const rows = TARGETS.map((key) => {
    const meters = PRESET_DISTANCES.find((p) => p.key === key)!.meters;
    const daniels = ready ? timeFromVdot(vdot, meters) : null;
    const riegel =
      distance && time ? riegelPredict(distance, time, meters, exponent) : null;
    return {
      key,
      meters,
      daniels,
      riegel,
      pace: daniels ? daniels / (meters / 1000) : null,
      isReference: distance !== null && Math.abs(distance - meters) < 0.5,
    };
  });

  const marathon = rows.find((r) => r.key === 'marathon')?.daniels ?? null;

  return (
    <ToolLayout
      inputs={
        <Panel
          title={m.calc_predictor_title()}
          description={m.calc_predictor_description()}
          action={<ResetButton onClick={reset} />}
        >
          <RecordChips
            distance={distance}
            time={time}
            onPick={(meters, seconds) =>
              patch({ rd: str(meters), rt: str(seconds) })
            }
          />
          <Field label={m.calc_reference_distance()} htmlFor="pred-distance">
            <DistancePicker
              id="pred-distance"
              value={distance}
              onChange={(v) => patch({ rd: str(v) })}
              unit={unit}
              presets={['1500m', '3k', '5k', '10k', 'half', 'marathon']}
            />
          </Field>
          <Field label={m.calc_reference_time()} htmlFor="pred-time">
            <DurationInput
              id="pred-time"
              value={time}
              onChange={(v) => patch({ rt: str(v) })}
              aria-label={m.calc_reference_time()}
            />
          </Field>
          <details className="group rounded-xl border px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {m.calc_advanced_settings()}
              <span className="text-muted-foreground transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="pt-4">
              <Field
                label={m.calc_riegel_exponent()}
                hint={m.calc_riegel_exponent_hint()}
              >
                <NumberInput
                  value={state.rx}
                  onChange={(v) => patch({ rx: v })}
                  placeholder="1.06"
                />
              </Field>
            </div>
          </details>
        </Panel>
      }
      results={
        ready ? (
          <>
            <ResultHero
              label="VDOT"
              value={formatNumber(vdot, 1)}
              info={m.calc_vdot_info()}
              sub={m.calc_vdot_sub({
                distance: formatDistance(distance as number, unit),
                time: formatDuration(time),
              })}
            >
              <HeroStat
                label={m.calc_estimated_vma()}
                value={formatNumber(vmaFromVdot(vdot), 1)}
                unit="km/h"
              />
              <HeroStat
                label={m.calc_marathon_pace()}
                value={displayPace(marathon ? marathon / 42.195 : null)}
                unit={`/${unit}`}
              />
              <HeroStat
                label={m.calc_distance_marathon()}
                value={formatDuration(marathon)}
              />
            </ResultHero>

            <Panel
              title={m.calc_predictions()}
              action={<InfoTip>{m.calc_predictions_info()}</InfoTip>}
            >
              <ul className="-my-2 flex flex-col divide-y">
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex min-w-0 items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        {presetLabel(row.key)}
                        {row.isReference && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            {m.calc_reference()}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {displayPace(row.pace)}/{unit}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-right sm:gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Riegel
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatDuration(row.riegel)}
                        </span>
                      </div>
                      <div className="flex min-w-20 flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Daniels
                        </span>
                        <span className="text-lg font-semibold tabular-nums">
                          {formatDuration(row.daniels)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        ) : (
          <EmptyResult>{m.calc_fill_reference()}</EmptyResult>
        )
      }
    />
  );
}
