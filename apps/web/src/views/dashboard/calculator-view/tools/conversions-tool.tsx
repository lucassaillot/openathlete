import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  METERS_PER_MILE,
  effortKilometers,
  formatDuration,
  formatNumber,
  formatPace,
  gradeAdjustedPace,
  pacePerKmToPerMile,
  paceToSpeedKmh,
  speedKmhToPace,
  treadmillFlatEquivalent,
} from '@/utils/running-calculator';
import { ArrowLeftRight, Mountain, MoveUpRight, Tally5 } from 'lucide-react';
import { useState } from 'react';

import { Field, NumberInput, PaceInput } from '../calculator-inputs';
import { InfoTip, Panel, Stat } from '../calculator-ui';
import { num, str, useToolState } from '../use-tool-state';

const DEFAULTS = {
  cp: '300',
  tm: '12',
  ti: '1',
  gp: '360',
  gg: '8',
  ek: '30',
  eg: '1200',
  ep: '360',
};

const MPH_PER_KMH = 1000 / METERS_PER_MILE;

export function ConversionsTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch] = useToolState('convert', DEFAULTS);

  const displayPace = (p: number | null) =>
    formatPace(unit === 'mi' ? pacePerKmToPerMile(p) : p);

  // Treadmill
  const tmSpeed = num(state.tm);
  const tmIncline = num(state.ti) ?? 0;
  const tmFlat = tmSpeed ? treadmillFlatEquivalent(tmSpeed, tmIncline) : null;

  // Grade
  const gradePace = num(state.gp);
  const grade = num(state.gg) ?? 0;
  const flatPace = gradePace ? gradeAdjustedPace(gradePace, grade) : null;

  // Trail effort
  const trailKm = num(state.ek);
  const trailDistance = trailKm ? trailKm * 1000 : null;
  const trailGain = num(state.eg) ?? 0;
  const trailPace = num(state.ep);
  const kmEffort = trailDistance
    ? effortKilometers(trailDistance, trailGain)
    : null;
  const trailTime = kmEffort && trailPace ? kmEffort * trailPace : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <PaceSpeedConverter
        pace={num(state.cp)}
        onChange={(p) => patch({ cp: str(p) })}
      />

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Tally5 className="size-4 text-primary" />
            {m.calc_treadmill_title()}
          </span>
        }
        description={m.calc_treadmill_description()}
        action={<InfoTip>{m.calc_treadmill_info()}</InfoTip>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={m.calc_speed()}>
            <NumberInput
              value={state.tm}
              onChange={(v) => patch({ tm: v })}
              suffix="km/h"
            />
          </Field>
          <Field label={m.calc_incline()}>
            <NumberInput
              value={state.ti}
              onChange={(v) => patch({ ti: v })}
              suffix="%"
              min={-10}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            className="bg-primary/10"
            label={m.calc_flat_speed()}
            value={formatNumber(tmFlat, 1)}
            unit="km/h"
          />
          <Stat
            className="bg-primary/10"
            label={m.calc_flat_pace()}
            value={displayPace(speedKmhToPace(tmFlat))}
            unit={`/${unit}`}
          />
        </div>
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <MoveUpRight className="size-4 text-primary" />
            {m.calc_grade_title()}
          </span>
        }
        description={m.calc_grade_description()}
        action={<InfoTip>{m.calc_grade_info()}</InfoTip>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Field label={m.calc_pace_on_slope()}>
            <PaceInput
              value={gradePace}
              onChange={(v) => patch({ gp: str(v) })}
              unit={unit}
            />
          </Field>
          <Field label={m.calc_slope()}>
            <NumberInput
              value={state.gg}
              onChange={(v) => patch({ gg: v })}
              suffix="%"
              min={-30}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            className="bg-primary/10"
            label={m.calc_flat_equivalent()}
            value={displayPace(flatPace)}
            unit={`/${unit}`}
          />
          <Stat
            label={m.calc_effort()}
            value={
              gradePace && flatPace
                ? `${grade >= 0 ? '+' : ''}${formatNumber((gradePace / flatPace - 1) * 100, 0)} %`
                : '—'
            }
          />
        </div>
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Mountain className="size-4 text-primary" />
            {m.calc_trail_title()}
          </span>
        }
        description={m.calc_trail_description()}
        action={<InfoTip>{m.calc_trail_info()}</InfoTip>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={m.calc_distance()}>
            <NumberInput
              value={state.ek}
              onChange={(v) => patch({ ek: v })}
              suffix="km"
            />
          </Field>
          <Field label={m.calc_elevation_gain()}>
            <NumberInput
              value={state.eg}
              onChange={(v) => patch({ eg: v })}
              suffix="m D+"
            />
          </Field>
        </div>
        <Field label={m.calc_flat_pace_effort()}>
          <PaceInput
            value={trailPace}
            onChange={(v) => patch({ ep: str(v) })}
            unit="km"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={m.calc_km_effort()}
            value={formatNumber(kmEffort, 1)}
            unit="km-e"
          />
          <Stat
            className="bg-primary/10"
            label={m.calc_estimated_time()}
            value={formatDuration(trailTime)}
          />
        </div>
      </Panel>
    </div>
  );
}

/** Four linked fields: editing one updates the others. */
function PaceSpeedConverter({
  pace,
  onChange,
}: {
  pace: number | null;
  onChange: (pace: number | null) => void;
}) {
  const speed = paceToSpeedKmh(pace);
  const [kmhText, setKmhText] = useState<string | null>(null);
  const [mphText, setMphText] = useState<string | null>(null);

  const fromKmh = (raw: string) => {
    setKmhText(raw);
    setMphText(null);
    const v = Number(raw.replace(',', '.'));
    onChange(raw !== '' && v > 0 ? speedKmhToPace(v) : null);
  };
  const fromMph = (raw: string) => {
    setMphText(raw);
    setKmhText(null);
    const v = Number(raw.replace(',', '.'));
    onChange(raw !== '' && v > 0 ? speedKmhToPace(v / MPH_PER_KMH) : null);
  };
  const resetTexts = () => {
    setKmhText(null);
    setMphText(null);
  };

  const round = (v: number | null, d: number) =>
    v === null ? '' : String(Math.round(v * 10 ** d) / 10 ** d);

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-primary" />
          {m.calc_convert_title()}
        </span>
      }
      description={m.calc_convert_description()}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`${m.calc_pace()} (min/km)`}>
          <PaceInput
            value={pace}
            onChange={(v) => {
              resetTexts();
              onChange(v);
            }}
            unit="km"
          />
        </Field>
        <Field label={`${m.calc_pace()} (min/mi)`}>
          <PaceInput
            value={pace}
            onChange={(v) => {
              resetTexts();
              onChange(v);
            }}
            unit="mi"
          />
        </Field>
        <Field label={`${m.calc_speed()} (km/h)`}>
          <NumberInput
            value={kmhText ?? round(speed, 2)}
            onChange={fromKmh}
            suffix="km/h"
          />
        </Field>
        <Field label={`${m.calc_speed()} (mph)`}>
          <NumberInput
            value={mphText ?? round(speed ? speed * MPH_PER_KMH : null, 2)}
            onChange={fromMph}
            suffix="mph"
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        {m.calc_convert_400m({
          time: formatDuration(pace ? (pace * 400) / 1000 : null),
        })}
      </p>
    </Panel>
  );
}
