import { m } from '@/paraglide/messages';
import { cn } from '@/utils/shadcn';
import { ExternalLink, Repeat, StickyNote } from 'lucide-react';

import type {
  StrengthContent,
  StrengthExerciseItem,
} from '@openathlete/shared';

import { formatSetsReps } from './strength-utils';

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-baseline gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium">{value}</span>
    </span>
  );
}

function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function ExerciseView({
  exercise,
  marker,
  compact,
}: {
  exercise: StrengthExerciseItem;
  marker: string;
  compact?: boolean;
}) {
  const prescription = formatSetsReps(exercise);
  const media = exercise.mediaUrl ? safeUrl(exercise.mediaUrl) : null;
  const tags = [
    exercise.load && { label: m.strength_field_load(), value: exercise.load },
    exercise.rest && { label: m.strength_field_rest(), value: exercise.rest },
    exercise.tempo && {
      label: m.strength_field_tempo(),
      value: exercise.tempo,
    },
    exercise.side && { label: m.strength_field_side(), value: exercise.side },
    ...exercise.custom
      .filter((c) => c.label || c.value)
      .map((c) => ({ label: c.label, value: c.value })),
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className={cn('flex min-w-0 gap-3', compact ? 'py-2' : 'py-3')}>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          compact
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {marker}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="min-w-0 break-words font-semibold">
            {exercise.name || m.strength_untitled_exercise()}
          </span>
          {prescription && (
            <span className="shrink-0 text-lg font-bold tabular-nums text-primary">
              {prescription}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <Tag key={i} label={tag.label} value={tag.value} />
            ))}
          </div>
        )}
        {exercise.notes && (
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {exercise.notes}
          </p>
        )}
        {media && (
          <a
            href={media}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            {m.strength_open_media()}
          </a>
        )}
      </div>
    </div>
  );
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function StrengthContentView({
  content,
  className,
}: {
  content: StrengthContent;
  className?: string;
}) {
  if (content.blocks.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {m.strength_empty_session()}
      </p>
    );
  }

  let exerciseNumber = 0;
  return (
    <div className={cn('flex min-w-0 flex-col divide-y', className)}>
      {content.blocks.map((block) => {
        if (block.type === 'exercise') {
          exerciseNumber += 1;
          return (
            <ExerciseView
              key={block.id}
              exercise={block.exercise}
              marker={String(exerciseNumber)}
            />
          );
        }
        if (block.type === 'note') {
          return (
            <div key={block.id} className="flex gap-3 py-3">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm">
                {block.text}
              </p>
            </div>
          );
        }
        exerciseNumber += 1;
        const circuitDetails = [
          block.rounds && m.strength_rounds_value({ rounds: block.rounds }),
          block.rest &&
            `${m.strength_field_rest().toLowerCase()} ${block.rest}`,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div key={block.id} className="py-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Repeat className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 break-words font-semibold">
                  {exerciseNumber}. {block.name || m.strength_block_circuit()}
                </span>
                {circuitDetails && (
                  <span className="text-sm font-medium text-primary">
                    {circuitDetails}
                  </span>
                )}
              </div>
              {block.notes && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {block.notes}
                </p>
              )}
              <div className="mt-1 flex flex-col divide-y">
                {block.exercises.map((exercise, i) => (
                  <ExerciseView
                    key={exercise.id}
                    exercise={exercise}
                    marker={LETTERS[i] ?? String(i + 1)}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
