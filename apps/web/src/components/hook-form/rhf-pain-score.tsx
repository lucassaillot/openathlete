import { getHighSaturatedRpeColor } from '@/utils/color';
import { cn } from '@/utils/shadcn';
import { ComponentProps } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { Button } from '../ui/button';
import { Label } from '../ui/label';

type Props = ComponentProps<'input'> & {
  name: string;
  label?: string;
  value?: number;
};

// Pain score is stored as 0-1 (same scale/severity color ramp as RPE),
// displayed to the user as a familiar 0-10 pain scale.
export const RHFPainScore = ({ name, label, ...other }: Props) => {
  const { control } = useFormContext();

  const scoreToStoredValue = (score: number) => score / 10;
  const storedValueToScore = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : Math.round(value * 10);

  return (
    <div className="grid gap-3">
      {label && (
        <Label htmlFor={name}>
          {label} {other.required ? '*' : ''}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => {
          const selectedScore = storedValueToScore(field.value);

          return (
            <div className="flex">
              {[...Array(11)].map((_, score) => {
                const isSelected = selectedScore === score;

                return (
                  <Button
                    key={score}
                    type="button"
                    onClick={() => field.onChange(scoreToStoredValue(score))}
                    className={cn(
                      'flex-1 rounded-none border border-gray-200 text-white dark:border-gray-700 sm:px-3 px-2',
                      score === 0 ? 'rounded-l-md' : '',
                      score === 10 ? 'rounded-r-md' : '',
                      score !== 0 ? 'border-l-0' : '',
                      isSelected
                        ? getHighSaturatedRpeColor(score / 10, false)
                        : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
                      error && 'border-red-500',
                    )}
                  >
                    {score}
                  </Button>
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
};
