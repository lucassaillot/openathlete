import { m } from '@/paraglide/messages';

import type {
  StrengthBlock,
  StrengthContent,
  StrengthExerciseItem,
} from '@openathlete/shared';

export const EMPTY_STRENGTH_CONTENT: StrengthContent = { blocks: [] };

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyExercise(name = ''): StrengthExerciseItem {
  return {
    id: newId(),
    name,
    sets: '',
    reps: '',
    load: '',
    rest: '',
    tempo: '',
    side: '',
    notes: '',
    mediaUrl: '',
    custom: [],
  };
}

export function emptyBlock(type: StrengthBlock['type']): StrengthBlock {
  if (type === 'exercise') {
    return { type, id: newId(), exercise: emptyExercise() };
  }
  if (type === 'circuit') {
    return {
      type,
      id: newId(),
      name: '',
      rounds: '',
      rest: '',
      notes: '',
      exercises: [emptyExercise()],
    };
  }
  return { type, id: newId(), text: '' };
}

/** Accepts anything coming from the API and returns a usable content. */
export function normalizeStrengthContent(value: unknown): StrengthContent {
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as StrengthContent).blocks)
  ) {
    return value as StrengthContent;
  }
  return EMPTY_STRENGTH_CONTENT;
}

/** "4 × 12" / "3 × 30 s" / "12" / "" */
export function formatSetsReps(exercise: StrengthExerciseItem): string {
  const sets = exercise.sets?.trim();
  const reps = exercise.reps?.trim();
  if (sets && reps) return `${sets} × ${reps}`;
  return sets || reps || '';
}

export function countExercises(content: StrengthContent): number {
  return content.blocks.reduce((total, block) => {
    if (block.type === 'exercise') return total + 1;
    if (block.type === 'circuit') return total + block.exercises.length;
    return total;
  }, 0);
}

/** Moves an item of a list, returning a new array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Plain-text version of a session, for copy/paste or messages. */
export function strengthContentToText(content: StrengthContent): string {
  const exerciseLine = (e: StrengthExerciseItem, indent = '') => {
    const details = [
      formatSetsReps(e),
      e.load,
      e.rest && `${m.strength_field_rest().toLowerCase()} ${e.rest}`,
      e.tempo && `${m.strength_field_tempo().toLowerCase()} ${e.tempo}`,
      e.side,
      ...e.custom.map((c) => `${c.label} ${c.value}`),
    ]
      .filter(Boolean)
      .join(' · ');
    const lines = [`${indent}• ${e.name}${details ? ` — ${details}` : ''}`];
    if (e.notes) lines.push(`${indent}  ${e.notes}`);
    return lines.join('\n');
  };
  return content.blocks
    .map((block) => {
      if (block.type === 'exercise') return exerciseLine(block.exercise);
      if (block.type === 'note') return block.text;
      const header = [
        block.name || m.strength_block_circuit(),
        block.rounds && `× ${block.rounds}`,
      ]
        .filter(Boolean)
        .join(' ');
      return [
        header,
        ...block.exercises.map((e) => exerciseLine(e, '  ')),
      ].join('\n');
    })
    .join('\n\n');
}
