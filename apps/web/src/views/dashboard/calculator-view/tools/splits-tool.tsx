import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  METERS_PER_MILE,
  type Split,
  computeSplits,
  formatDistance,
  formatDuration,
  formatPace,
  pacePerKmToPerMile,
  timeFromPace,
} from '@/utils/running-calculator';
import { cn } from '@/utils/shadcn';
import { Flag } from 'lucide-react';

import {
  Chip,
  DistancePicker,
  DurationInput,
  Field,
  PaceInput,
  Segmented,
} from '../calculator-inputs';
import {
  CopyButton,
  EmptyResult,
  HeroStat,
  Panel,
  PrintButton,
  ResetButton,
  ResultHero,
  ToolLayout,
} from '../calculator-ui';
import { num, str, useToolState } from '../use-tool-state';

type Mode = 'time' | 'pace';
type Strategy = 'even' | 'negative' | 'positive';

const INTERVALS = [
  { key: '400', meters: 400, label: '400 m' },
  { key: '1000', meters: 1000, label: '1 km' },
  { key: 'mile', meters: METERS_PER_MILE, label: '1 mi' },
  { key: '5000', meters: 5000, label: '5 km' },
];

const MILESTONES = [5000, 10000, 21097.5, 30000, 42195];

const DEFAULTS = {
  mode: 'time',
  d: '10000',
  t: '2700',
  p: '270',
  iv: '1000',
  st: 'even',
  sp: '2',
};

function printWristband(title: string, splits: Split[], unit: DistanceUnit) {
  const win = window.open('', '_blank', 'width=480,height=720');
  if (!win) return;
  const rows = splits
    .map(
      (s) =>
        `<tr${MILESTONES.some((ms) => Math.abs(ms - s.distance) < 1) ? ' class="ms"' : ''}><td>${formatDistance(s.distance, unit)}</td><td>${formatDuration(s.cumulativeTime)}</td><td>${formatDuration(s.splitTime)}</td></tr>`,
    )
    .join('');
  win.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,sans-serif;margin:16px;color:#000}
  h1{font-size:14px;margin:0 0 8px} table{border-collapse:collapse;width:260px;font-variant-numeric:tabular-nums}
  td{border:1px solid #000;padding:3px 6px;font-size:13px} td:nth-child(2){font-weight:700;font-size:15px}
  tr.ms td{background:#eee} @page{margin:10mm}
</style></head><body><h1>${title}</h1><table>${rows}</table>
<script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
}

export function SplitsTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch, reset] = useToolState('splits', DEFAULTS);
  const mode = state.mode as Mode;
  const strategy = state.st as Strategy;
  const distance = num(state.d);
  const pace = num(state.p);
  const totalTime =
    mode === 'time' ? num(state.t) : timeFromPace(distance ?? 0, pace ?? 0);
  const interval = INTERVALS.find((i) => i.key === state.iv)?.meters ?? 1000;
  const percent =
    strategy === 'even'
      ? 0
      : (strategy === 'negative' ? -1 : 1) * (num(state.sp) ?? 0);

  const splits =
    distance && totalTime
      ? computeSplits(distance, totalTime, interval, percent)
      : [];
  const ready = splits.length > 0 && distance !== null && totalTime !== null;

  const displayPace = (p: number) =>
    formatPace(unit === 'mi' ? pacePerKmToPerMile(p) : p);
  // With 1 km (or 1 mi) splits the pace column would repeat the split time
  const showPace =
    Math.abs(interval - (unit === 'mi' ? METERS_PER_MILE : 1000)) > 1;

  const halfIndex = splits.findIndex((s) => s.distance >= (distance ?? 0) / 2);
  const firstHalf = distance && totalTime ? timeAt(splits, distance / 2) : null;

  const paces = splits.map((s) => s.pace);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);

  const title = ready
    ? `${formatDistance(distance as number, unit)} – ${formatDuration(totalTime)}`
    : '';

  const asText = () =>
    [
      title,
      ...splits.map(
        (s) =>
          `${formatDistance(s.distance, unit)}\t${formatDuration(s.cumulativeTime)}\t${formatDuration(s.splitTime)}\t${displayPace(s.pace)}/${unit}`,
      ),
    ].join('\n');

  return (
    <ToolLayout
      inputs={
        <Panel
          title={m.calc_splits_title()}
          description={m.calc_splits_description()}
          action={<ResetButton onClick={reset} />}
        >
          <Field label={m.calc_distance()} htmlFor="splits-distance">
            <DistancePicker
              id="splits-distance"
              value={distance}
              onChange={(v) => patch({ d: str(v) })}
              unit={unit}
              presets={['5k', '10k', '15k', 'half', 'marathon']}
            />
          </Field>

          <Field label={m.calc_target()}>
            <Segmented
              value={mode}
              onChange={(value) => patch({ mode: value })}
              options={[
                { value: 'time', label: m.calc_target_time() },
                { value: 'pace', label: m.calc_target_pace() },
              ]}
            />
            {mode === 'time' ? (
              <DurationInput
                value={num(state.t)}
                onChange={(v) => patch({ t: str(v) })}
                aria-label={m.calc_target_time()}
              />
            ) : (
              <PaceInput
                value={pace}
                onChange={(v) => patch({ p: str(v) })}
                unit={unit}
              />
            )}
          </Field>

          <Field label={m.calc_split_every()}>
            <div className="flex flex-wrap gap-1.5">
              {INTERVALS.map((i) => (
                <Chip
                  key={i.key}
                  active={state.iv === i.key}
                  onClick={() => patch({ iv: i.key })}
                >
                  {i.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field
            label={m.calc_strategy()}
            hint={
              strategy === 'even'
                ? m.calc_strategy_even_hint()
                : strategy === 'negative'
                  ? m.calc_strategy_negative_hint({ percent: state.sp })
                  : m.calc_strategy_positive_hint({ percent: state.sp })
            }
          >
            <Segmented
              value={strategy}
              onChange={(value) => patch({ st: value })}
              options={[
                { value: 'even', label: m.calc_strategy_even() },
                { value: 'negative', label: m.calc_strategy_negative() },
                { value: 'positive', label: m.calc_strategy_positive() },
              ]}
            />
            {strategy !== 'even' && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={num(state.sp) ?? 2}
                  onChange={(e) => patch({ sp: e.target.value })}
                  className="h-2 flex-1 cursor-pointer accent-primary"
                  aria-label={m.calc_strategy()}
                />
                <span className="w-12 text-right text-sm font-semibold tabular-nums">
                  {state.sp} %
                </span>
              </div>
            )}
          </Field>
        </Panel>
      }
      results={
        ready ? (
          <>
            <ResultHero
              label={m.calc_finish_time()}
              value={formatDuration(totalTime)}
              sub={`${formatDistance(distance as number, unit)} · ${displayPace(totalTime / ((distance as number) / 1000))} /${unit}`}
              info={m.calc_splits_info()}
            >
              <HeroStat
                label={m.calc_first_half()}
                value={formatDuration(firstHalf)}
              />
              <HeroStat
                label={m.calc_second_half()}
                value={formatDuration(
                  firstHalf !== null ? totalTime - firstHalf : null,
                )}
              />
              <HeroStat label={m.calc_splits_count()} value={splits.length} />
            </ResultHero>

            <Panel
              title={m.calc_splits_table()}
              action={
                <>
                  <CopyButton getText={asText} />
                  <span className="hidden sm:inline-flex">
                    <PrintButton
                      onClick={() => printWristband(title, splits, unit)}
                    />
                  </span>
                </>
              }
            >
              {splits.length > 1 && splits.length <= 60 && (
                <PaceProfile
                  splits={splits}
                  fastest={fastest}
                  slowest={slowest}
                />
              )}

              {/* Mobile: compact list */}
              <ol className="-mx-1 flex flex-col divide-y md:hidden">
                {splits.map((s, i) => (
                  <SplitListItem
                    key={s.index}
                    split={s}
                    unit={unit}
                    pace={showPace ? displayPace(s.pace) : null}
                    isHalf={i === halfIndex}
                  />
                ))}
              </ol>

              {/* Desktop: table */}
              <div className="hidden max-h-[28rem] overflow-y-auto rounded-xl border md:block">
                <table className="w-full text-sm tabular-nums">
                  <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">
                        {m.calc_distance()}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {m.calc_split()}
                      </th>
                      {showPace && (
                        <th className="px-3 py-2 text-right font-medium">
                          {m.calc_pace()}
                        </th>
                      )}
                      <th className="px-3 py-2 text-right font-medium">
                        {m.calc_cumulative()}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((s, i) => {
                      const milestone = isMilestone(s.distance);
                      return (
                        <tr
                          key={s.index}
                          className={cn(
                            'border-t even:bg-muted/30',
                            (milestone || i === halfIndex) &&
                              'bg-primary/5 font-semibold even:bg-primary/5',
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {s.index}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              {formatDistance(s.distance, unit)}
                              {milestone && (
                                <Flag className="size-3 text-primary" />
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatDuration(s.splitTime)}
                          </td>
                          {showPace && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {displayPace(s.pace)}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right text-base font-semibold">
                            {formatDuration(s.cumulativeTime)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : (
          <EmptyResult>
            {splits.length === 0 && distance && totalTime
              ? m.calc_too_many_splits()
              : m.calc_fill_distance_and_target()}
          </EmptyResult>
        )
      }
    />
  );
}

function isMilestone(meters: number) {
  return MILESTONES.some((ms) => Math.abs(ms - meters) < 1);
}

function timeAt(splits: Split[], meters: number): number | null {
  let prevDistance = 0;
  let prevTime = 0;
  for (const s of splits) {
    if (s.distance >= meters) {
      return prevTime + ((meters - prevDistance) / 1000) * s.pace;
    }
    prevDistance = s.distance;
    prevTime = s.cumulativeTime;
  }
  return null;
}

function SplitListItem({
  split,
  unit,
  pace,
  isHalf,
}: {
  split: Split;
  unit: DistanceUnit;
  pace: string | null;
  isHalf: boolean;
}) {
  const milestone = isMilestone(split.distance);
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 px-1 py-2.5',
        (milestone || isHalf) && 'rounded-lg bg-primary/5 px-2',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
          {split.index}
        </span>
        <span
          className={cn(
            'truncate font-medium',
            milestone && 'font-semibold text-primary',
          )}
        >
          {formatDistance(split.distance, unit)}
        </span>
        {milestone && <Flag className="size-3 shrink-0 text-primary" />}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-lg font-semibold tabular-nums">
          {formatDuration(split.cumulativeTime)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(split.splitTime)}
          {pace && ` · ${pace}/${unit}`}
        </span>
      </div>
    </li>
  );
}

/** Small bar chart: one bar per split, taller = faster. */
function PaceProfile({
  splits,
  fastest,
  slowest,
}: {
  splits: Split[];
  fastest: number;
  slowest: number;
}) {
  const spread = slowest - fastest;
  return (
    <div
      className="flex h-16 items-end gap-0.5"
      role="img"
      aria-label={m.calc_pace_profile()}
    >
      {splits.map((s) => {
        // Height proportional to speed, on a scale starting at 85% of the
        // slowest speed so small pace differences stay readable.
        const floor = 0.85 / slowest;
        const ratio =
          spread < 0.01 ? 1 : (1 / s.pace - floor) / (1 / fastest - floor);
        const isPartial = s.length < splits[0].length - 0.5;
        return (
          <div
            key={s.index}
            title={`${s.index} · ${formatPace(s.pace)}/km`}
            className={cn(
              'min-w-0 flex-1 rounded-t-sm bg-primary/80 transition-[height]',
              isPartial && 'bg-primary/40',
            )}
            style={{ height: `${Math.max(8, ratio * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
