import { useGetStrengthExercisesQuery } from '@/api/strength';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { m } from '@/paraglide/messages';
import { cn } from '@/utils/shadcn';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Dumbbell,
  Plus,
  Repeat,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { useId, useState } from 'react';

import type {
  StrengthBlock,
  StrengthContent,
  StrengthExercise,
  StrengthExerciseItem,
} from '@openathlete/shared';

import { emptyBlock, emptyExercise, moveItem } from './strength-utils';

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function MiniField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn('size-8 text-muted-foreground', className)}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Exercise fields
// ---------------------------------------------------------------------------

function ExerciseFields({
  exercise,
  onChange,
  library,
  datalistId,
}: {
  exercise: StrengthExerciseItem;
  onChange: (exercise: StrengthExerciseItem) => void;
  library: StrengthExercise[];
  datalistId: string;
}) {
  const hasExtras = Boolean(
    exercise.tempo ||
      exercise.side ||
      exercise.mediaUrl ||
      exercise.custom.length > 0,
  );
  const [showMore, setShowMore] = useState(hasExtras);
  const set = (patch: Partial<StrengthExerciseItem>) =>
    onChange({ ...exercise, ...patch });

  const handleName = (name: string) => {
    const known = library.find(
      (e) => e.name.toLowerCase() === name.trim().toLowerCase(),
    );
    // Pre-fill the library defaults on an exercise that has none yet
    set({
      name,
      ...(known && !exercise.notes && known.defaultNotes
        ? { notes: known.defaultNotes }
        : {}),
      ...(known && !exercise.mediaUrl && known.mediaUrl
        ? { mediaUrl: known.mediaUrl }
        : {}),
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Input
        value={exercise.name}
        onChange={(e) => handleName(e.target.value)}
        placeholder={m.strength_exercise_name_placeholder()}
        list={datalistId}
        aria-label={m.strength_exercise_name()}
        className="h-11 text-base font-medium"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniField
          label={m.strength_field_sets()}
          value={exercise.sets}
          onChange={(sets) => set({ sets })}
          placeholder="3"
        />
        <MiniField
          label={m.strength_field_reps()}
          value={exercise.reps}
          onChange={(reps) => set({ reps })}
          placeholder="12 / 30 s"
        />
        <MiniField
          label={m.strength_field_load()}
          value={exercise.load}
          onChange={(load) => set({ load })}
          placeholder={m.strength_field_load_placeholder()}
        />
        <MiniField
          label={m.strength_field_rest()}
          value={exercise.rest}
          onChange={(rest) => set({ rest })}
          placeholder="1 min"
        />
      </div>
      <Textarea
        value={exercise.notes}
        onChange={(e) => set({ notes: e.target.value })}
        placeholder={m.strength_field_notes_placeholder()}
        aria-label={m.strength_field_notes()}
        className="min-h-16"
      />

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="inline-flex w-fit cursor-pointer items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={showMore}
      >
        <ChevronDown
          className={cn(
            'size-4 transition-transform',
            showMore && 'rotate-180',
          )}
        />
        {m.strength_more_options()}
      </button>

      {showMore && (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted/50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <MiniField
              label={m.strength_field_tempo()}
              value={exercise.tempo}
              onChange={(tempo) => set({ tempo })}
              placeholder="3-1-1"
            />
            <MiniField
              label={m.strength_field_side()}
              value={exercise.side}
              onChange={(side) => set({ side })}
              placeholder={m.strength_field_side_placeholder()}
            />
          </div>
          <MiniField
            label={m.strength_field_media()}
            value={exercise.mediaUrl}
            onChange={(mediaUrl) => set({ mediaUrl })}
            placeholder="https://youtube.com/…"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {m.strength_custom_fields()}
            </span>
            {exercise.custom.map((field, i) => (
              <div key={i} className="flex min-w-0 items-center gap-2">
                <Input
                  value={field.label}
                  onChange={(e) =>
                    set({
                      custom: exercise.custom.map((c, j) =>
                        j === i ? { ...c, label: e.target.value } : c,
                      ),
                    })
                  }
                  placeholder={m.strength_custom_field_label()}
                  aria-label={m.strength_custom_field_label()}
                  className="h-10 min-w-0 flex-1"
                />
                <Input
                  value={field.value}
                  onChange={(e) =>
                    set({
                      custom: exercise.custom.map((c, j) =>
                        j === i ? { ...c, value: e.target.value } : c,
                      ),
                    })
                  }
                  placeholder={m.strength_custom_field_value()}
                  aria-label={m.strength_custom_field_value()}
                  className="h-10 min-w-0 flex-1"
                />
                <IconButton
                  label={m.strength_remove()}
                  onClick={() =>
                    set({ custom: exercise.custom.filter((_, j) => j !== i) })
                  }
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                set({ custom: [...exercise.custom, { label: '', value: '' }] })
              }
            >
              <Plus className="size-3.5" />
              {m.strength_add_custom_field()}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block shell
// ---------------------------------------------------------------------------

const BLOCK_META: Record<
  StrengthBlock['type'],
  { icon: typeof Dumbbell; label: () => string }
> = {
  exercise: { icon: Dumbbell, label: () => m.strength_block_exercise() },
  circuit: { icon: Repeat, label: () => m.strength_block_circuit() },
  note: { icon: StickyNote, label: () => m.strength_block_note() },
};

function BlockShell({
  block,
  index,
  total,
  onMove,
  onRemove,
  children,
}: {
  block: StrengthBlock;
  index: number;
  total: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { icon: Icon, label } = BLOCK_META[block.type];
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4',
        block.type === 'circuit' && 'border-primary/30 bg-primary/[0.03]',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
            {index + 1}
          </span>
          <Icon className="size-4 shrink-0 text-primary" />
          <span className="truncate">{label()}</span>
        </span>
        <span className="flex shrink-0 items-center">
          <IconButton
            label={m.strength_move_up()}
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
          >
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton
            label={m.strength_move_down()}
            onClick={() => onMove(index + 1)}
            disabled={index === total - 1}
          >
            <ArrowDown className="size-4" />
          </IconButton>
          <IconButton
            label={m.strength_remove()}
            onClick={onRemove}
            className="hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </span>
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function StrengthContentEditor({
  value,
  onChange,
}: {
  value: StrengthContent;
  onChange: (value: StrengthContent) => void;
}) {
  const datalistId = useId();
  const { data: library = [] } = useGetStrengthExercisesQuery();
  const blocks = value.blocks;

  const setBlocks = (next: StrengthBlock[]) => onChange({ blocks: next });
  const updateBlock = (index: number, block: StrengthBlock) =>
    setBlocks(blocks.map((b, i) => (i === index ? block : b)));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <datalist id={datalistId}>
        {library.map((e) => (
          <option key={e.strengthExerciseId} value={e.name} />
        ))}
      </datalist>

      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {m.strength_editor_empty()}
        </p>
      )}

      {blocks.map((block, index) => (
        <BlockShell
          key={block.id}
          block={block}
          index={index}
          total={blocks.length}
          onMove={(to) => setBlocks(moveItem(blocks, index, to))}
          onRemove={() => setBlocks(blocks.filter((_, i) => i !== index))}
        >
          {block.type === 'exercise' && (
            <ExerciseFields
              exercise={block.exercise}
              onChange={(exercise) =>
                updateBlock(index, { ...block, exercise })
              }
              library={library}
              datalistId={datalistId}
            />
          )}

          {block.type === 'note' && (
            <Textarea
              value={block.text}
              onChange={(e) =>
                updateBlock(index, { ...block, text: e.target.value })
              }
              placeholder={m.strength_note_placeholder()}
              aria-label={m.strength_block_note()}
              className="min-h-20"
            />
          )}

          {block.type === 'circuit' && (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <MiniField
                  className="col-span-2 sm:col-span-1"
                  label={m.strength_circuit_name()}
                  value={block.name}
                  onChange={(name) => updateBlock(index, { ...block, name })}
                  placeholder={m.strength_circuit_name_placeholder()}
                />
                <MiniField
                  label={m.strength_field_rounds()}
                  value={block.rounds}
                  onChange={(rounds) =>
                    updateBlock(index, { ...block, rounds })
                  }
                  placeholder="3"
                />
                <MiniField
                  label={m.strength_field_rest_between_rounds()}
                  value={block.rest}
                  onChange={(rest) => updateBlock(index, { ...block, rest })}
                  placeholder="2 min"
                />
              </div>
              <Textarea
                value={block.notes}
                onChange={(e) =>
                  updateBlock(index, { ...block, notes: e.target.value })
                }
                placeholder={m.strength_field_notes_placeholder()}
                aria-label={m.strength_field_notes()}
                className="min-h-12"
              />
              {block.exercises.map((exercise, i) => (
                <div
                  key={exercise.id}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {m.strength_block_exercise()}{' '}
                      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] ?? i + 1}
                    </span>
                    <span className="flex items-center">
                      <IconButton
                        label={m.strength_move_up()}
                        onClick={() =>
                          updateBlock(index, {
                            ...block,
                            exercises: moveItem(block.exercises, i, i - 1),
                          })
                        }
                        disabled={i === 0}
                      >
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton
                        label={m.strength_move_down()}
                        onClick={() =>
                          updateBlock(index, {
                            ...block,
                            exercises: moveItem(block.exercises, i, i + 1),
                          })
                        }
                        disabled={i === block.exercises.length - 1}
                      >
                        <ArrowDown className="size-4" />
                      </IconButton>
                      <IconButton
                        label={m.strength_remove()}
                        onClick={() =>
                          updateBlock(index, {
                            ...block,
                            exercises: block.exercises.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </span>
                  </div>
                  <ExerciseFields
                    exercise={exercise}
                    onChange={(next) =>
                      updateBlock(index, {
                        ...block,
                        exercises: block.exercises.map((e, j) =>
                          j === i ? next : e,
                        ),
                      })
                    }
                    library={library}
                    datalistId={datalistId}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() =>
                  updateBlock(index, {
                    ...block,
                    exercises: [...block.exercises, emptyExercise()],
                  })
                }
              >
                <Plus className="size-3.5" />
                {m.strength_add_exercise_to_circuit()}
              </Button>
            </div>
          )}
        </BlockShell>
      ))}

      <div className="grid grid-cols-3 gap-2">
        {(['exercise', 'circuit', 'note'] as const).map((type) => {
          const { icon: Icon, label } = BLOCK_META[type];
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              className="h-auto min-w-0 flex-col gap-1 py-2.5 sm:flex-row sm:gap-2"
              onClick={() => setBlocks([...blocks, emptyBlock(type)])}
            >
              <span className="flex items-center gap-1">
                <Plus className="size-3.5" />
                <Icon className="size-4" />
              </span>
              <span className="truncate text-xs sm:text-sm">{label()}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
