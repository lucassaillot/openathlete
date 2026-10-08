import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  formatNumber,
  formatPace,
  hrZones,
  maxHrFox,
  maxHrTanaka,
  pacePerKmToPerMile,
  vdotFromPerformance,
  vmaFromCooper,
  vmaFromHalfCooper,
  vmaFromVdot,
  vo2maxFromVma,
} from '@/utils/running-calculator';
import { ArrowRight, HeartPulse, Zap } from 'lucide-react';

import {
  Chip,
  DistancePicker,
  DurationInput,
  Field,
  NumberInput,
  Segmented,
} from '../calculator-inputs';
import { EmptyResult, InfoTip, Panel, Stat, ZoneRow } from '../calculator-ui';
import { num, str, useToolState, writeCalcPreference } from '../use-tool-state';

type Test = 'half_cooper' | 'cooper' | 'race';

const DEFAULTS = {
  test: 'half_cooper',
  td: '',
  rd: '10000',
  rt: '2700',
  age: '',
  hrmax: '',
  hrrest: '',
};

const HR_ZONE_LABELS = [
  () => m.calc_hr_z1(),
  () => m.calc_hr_z2(),
  () => m.calc_hr_z3(),
  () => m.calc_hr_z4(),
  () => m.calc_hr_z5(),
];

export function VmaHrTool({
  unit,
  onUseVma,
}: {
  unit: DistanceUnit;
  onUseVma: () => void;
}) {
  const [state, patch] = useToolState('vma', DEFAULTS);
  const test = state.test as Test;
  const testDistance = num(state.td);
  const raceDistance = num(state.rd);
  const raceTime = num(state.rt);

  let vma: number | null = null;
  if (test === 'half_cooper') vma = vmaFromHalfCooper(testDistance ?? 0);
  if (test === 'cooper') vma = vmaFromCooper(testDistance ?? 0);
  if (test === 'race' && raceDistance && raceTime) {
    const vdot = vdotFromPerformance(raceDistance, raceTime);
    vma = vdot ? vmaFromVdot(vdot) : null;
  }
  const validVma = vma !== null && vma >= 6 && vma <= 30 ? vma : null;
  const vmaPace = validVma ? 3600 / validVma : null;

  const age = num(state.age);
  const fox = age ? maxHrFox(age) : null;
  const tanaka = age ? maxHrTanaka(age) : null;
  const hrMax = num(state.hrmax);
  const hrRest = num(state.hrrest);
  const validMax =
    hrMax !== null && hrMax >= 120 && hrMax <= 240 ? hrMax : null;
  const zones = validMax ? hrZones(validMax, hrRest) : [];
  const karvonen =
    validMax !== null && hrRest !== null && hrRest > 30 && hrRest < validMax;

  const testHint: Record<Test, string> = {
    half_cooper: m.calc_test_half_cooper_hint(),
    cooper: m.calc_test_cooper_hint(),
    race: m.calc_test_race_hint(),
  };

  const handleUseVma = () => {
    if (!validVma) return;
    writeCalcPreference('vma', str(Math.round(validVma * 10) / 10));
    writeCalcPreference('src', 'vma');
    onUseVma();
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            {m.calc_vma_title()}
          </span>
        }
        description={m.calc_vma_description()}
        action={<InfoTip>{m.calc_vma_tests_info()}</InfoTip>}
      >
        <Field label={m.calc_test()} hint={testHint[test]}>
          <Segmented
            value={test}
            onChange={(value) => patch({ test: value })}
            options={[
              { value: 'half_cooper', label: m.calc_test_half_cooper() },
              { value: 'cooper', label: 'Cooper' },
              { value: 'race', label: m.calc_test_race() },
            ]}
          />
        </Field>

        {test === 'race' ? (
          <>
            <Field label={m.calc_distance()}>
              <DistancePicker
                value={raceDistance}
                onChange={(v) => patch({ rd: str(v) })}
                unit={unit}
                presets={['3k', '5k', '10k', 'half']}
              />
            </Field>
            <Field label={m.calc_time()}>
              <DurationInput
                value={raceTime}
                onChange={(v) => patch({ rt: str(v) })}
                aria-label={m.calc_time()}
              />
            </Field>
          </>
        ) : (
          <Field label={m.calc_distance_covered()}>
            <NumberInput
              value={state.td}
              onChange={(v) => patch({ td: v })}
              suffix="m"
              placeholder={test === 'cooper' ? '3000' : '1500'}
            />
          </Field>
        )}

        {validVma ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat
                className="col-span-2 bg-primary text-primary-foreground sm:col-span-1 [&_div:first-child]:text-primary-foreground/70"
                label={m.calc_vma()}
                value={formatNumber(validVma, 1)}
                unit="km/h"
              />
              <Stat
                label={m.calc_vma_pace()}
                value={formatPace(
                  unit === 'mi' ? pacePerKmToPerMile(vmaPace) : vmaPace,
                )}
                unit={`/${unit}`}
              />
              <Stat
                label="VO2max ≈"
                value={formatNumber(vo2maxFromVma(validVma), 0)}
                unit="ml/kg/min"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleUseVma}>
              {m.calc_use_vma_for_paces()}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <EmptyResult>{m.calc_fill_test()}</EmptyResult>
        )}
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <HeartPulse className="size-4 text-red-500" />
            {m.calc_hr_title()}
          </span>
        }
        description={m.calc_hr_description()}
        action={<InfoTip>{m.calc_hr_info()}</InfoTip>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={m.calc_hr_max()}>
            <NumberInput
              value={state.hrmax}
              onChange={(v) => patch({ hrmax: v })}
              suffix="bpm"
              placeholder="190"
            />
          </Field>
          <Field label={m.calc_hr_rest()}>
            <NumberInput
              value={state.hrrest}
              onChange={(v) => patch({ hrrest: v })}
              suffix="bpm"
              placeholder={m.calc_optional()}
            />
          </Field>
        </div>

        <Field label={m.calc_estimate_from_age()}>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3">
            <NumberInput
              value={state.age}
              onChange={(v) => patch({ age: v })}
              suffix={m.calc_years()}
              placeholder="35"
            />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {fox && (
                <Chip
                  active={hrMax === Math.round(fox)}
                  onClick={() => patch({ hrmax: String(Math.round(fox)) })}
                >
                  220 − {m.calc_age()} · {Math.round(fox)}
                </Chip>
              )}
              {tanaka && (
                <Chip
                  active={hrMax === Math.round(tanaka)}
                  onClick={() => patch({ hrmax: String(Math.round(tanaka)) })}
                >
                  Tanaka · {Math.round(tanaka)}
                </Chip>
              )}
            </div>
          </div>
        </Field>

        {zones.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {karvonen ? m.calc_hr_method_karvonen() : m.calc_hr_method_max()}
            </p>
            <ul className="-my-1 flex flex-col divide-y">
              {zones.map((z, i) => (
                <ZoneRow
                  key={z.key}
                  colorIndex={[0, 1, 3, 4, 5][i]}
                  name={`Z${i + 1} · ${HR_ZONE_LABELS[i]()}`}
                  description={`${z.low}–${z.high} %`}
                  value={
                    <>
                      {z.bpmLow} – {z.bpmHigh}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        bpm
                      </span>
                    </>
                  }
                />
              ))}
            </ul>
          </div>
        ) : (
          <EmptyResult>{m.calc_fill_hr()}</EmptyResult>
        )}
      </Panel>
    </div>
  );
}
