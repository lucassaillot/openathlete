import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  METERS_PER_MILE,
  formatDuration,
  formatNumber,
  formatPace,
  gradeAdjustedPace,
  pacePerKmToPerMile,
  paceToSpeedKmh,
  speedKmhToPace,
} from '@/utils/running-calculator';
import { ArrowLeftRight, MoveUpRight } from 'lucide-react';
import { useState } from 'react';

import { Field, NumberInput, PaceInput } from '../calculator-inputs';
import { InfoTip, Panel, Stat } from '../calculator-ui';
import { num, str, useToolState } from '../use-tool-state';

const DEFAULTS = {
  cp: '300',
  gp: '360',
  gg: '8',
};

const MPH_PER_KMH = 1000 / METERS_PER_MILE;

export function ConversionsTool({ unit }: { unit: DistanceUnit }) {
  const [state, patch] = useToolState('convert', DEFAULTS);

  const displayPace = (p: number | null) =>
    formatPace(unit === 'mi' ? pacePerKmToPerMile(p) : p);

  // Grade
  const gradePace = num(state.gp);
  const grade = num(state.gg) ?? 0;
  const flatPace = gradePace ? gradeAdjustedPace(gradePace, grade) : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <PaceSpeedConverter
        pace={num(state.cp)}
        onChange={(p) => patch({ cp: str(p) })}
      />

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
