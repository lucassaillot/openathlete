import { Separator } from '@/components/ui/separator';
import * as m from '@/paraglide/messages';
import { getStepTypeLabel } from '@/utils/workout';

import {
  type SPORT_TYPE,
  type WorkoutDto,
  type WorkoutStepDto,
  type WorkoutStepTargetDto,
  calculateWorkoutDistance,
  calculateWorkoutDuration,
  formatDistance,
  formatDuration,
} from '@openathlete/shared';

import { DurationDisplay } from './duration-display';
import { TargetBadge } from './target-badge';
import { TypeIcon } from './type-icon';

interface WorkoutSummaryProps {
  workout: WorkoutDto;
  sport?: SPORT_TYPE;
  athleteId?: number;
}

export function WorkoutSummary({
  workout,
  sport,
  athleteId,
}: WorkoutSummaryProps) {
  const estimatedDuration = calculateWorkoutDuration(workout);
  const totalDistance = calculateWorkoutDistance(workout);

  const renderStep = (step: WorkoutStepDto, index: number, isChild = false) => {
    const isRepeat = step.stepType === 'REPEAT' && step.repeatBlock;

    return (
      <div
        key={step.workoutStepId || index}
        className={`${isChild ? 'border-l-2 border-muted' : ''}`}
      >
        <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40 sm:flex-row sm:items-start sm:gap-3 sm:p-3">
          <div className="flex min-w-0 items-center gap-2 sm:flex-shrink-0">
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {isChild ? `${index + 1}` : `${m.step()} ${index + 1}`}
            </span>
            <TypeIcon
              stepType={step.stepType}
              className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
            />
            {/* On mobile the step title moves up here, next to the icon,
                so the icon+index block doesn't sit alone on its own line */}
            <span className="min-w-0 truncate text-sm font-medium sm:hidden">
              {getStepTypeLabel(step.stepType)}
              {step.name ? ` - ${step.name}` : ''}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="hidden flex-wrap items-center gap-1 sm:flex sm:gap-2">
              <span className="min-w-0 break-words text-sm font-medium">
                {getStepTypeLabel(step.stepType)}{' '}
                {step.name ? `- ${step.name}` : ''}
              </span>
              {step.exerciseName && (
                <span className="min-w-0 break-words text-sm text-muted-foreground">
                  • {step.exerciseName}
                </span>
              )}
            </div>
            {/* Exercise name gets its own line on mobile since it no
                longer shares a row with the (now hidden-until-sm) title
                above — free-form user text, so it wraps rather than
                forcing the row wider. */}
            {step.exerciseName && (
              <p className="min-w-0 break-words text-sm text-muted-foreground sm:hidden">
                • {step.exerciseName}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!step.repeatBlock && (
                <DurationDisplay
                  className="shrink-0 text-sm text-muted-foreground"
                  durationType={step.durationType}
                  durationValue={step.durationValue}
                />
              )}

              {step.targets && step.targets.length > 0 && (
                <div className="flex min-w-0 flex-wrap gap-2">
                  {step.targets.map(
                    (target: WorkoutStepTargetDto, idx: number) => (
                      <TargetBadge
                        key={idx}
                        target={target}
                        showAbsoluteValues={true}
                        sport={sport}
                        athleteId={athleteId}
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            {step.notes && (
              <p className="min-w-0 break-words text-sm text-muted-foreground italic">
                {step.notes}
              </p>
            )}

            {isRepeat && step.repeatBlock && (
              <div className="mt-3 min-w-0 rounded-lg border border-violet-200 bg-violet-50 p-2 dark:border-violet-900 dark:bg-violet-950/20 sm:p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                    {m.workout_repetitions({
                      count: step.repeatBlock.repetitions,
                    })}
                  </span>
                </div>
                <div className="space-y-2">
                  {step.repeatBlock.childSteps.map(
                    (childStep: WorkoutStepDto, childIdx: number) =>
                      renderStep(childStep, childIdx, true),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <>
      {workout.steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{m.workout_summary_empty()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workout.steps.map((step: WorkoutStepDto, index: number) =>
            renderStep(step, index),
          )}
        </div>
      )}

      {workout.steps.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {estimatedDuration && (
              <div>
                <span className="text-muted-foreground">
                  {m.workout_estimated_duration()}:
                </span>
                <span className="ml-2 font-medium">
                  {formatDuration(estimatedDuration)}
                </span>
              </div>
            )}
            {totalDistance && (
              <div>
                <span className="text-muted-foreground">
                  {m.workout_estimated_distance()}:
                </span>
                <span className="ml-2 font-medium">
                  {formatDistance(totalDistance, 'km')}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  return <div>{content}</div>;
}
