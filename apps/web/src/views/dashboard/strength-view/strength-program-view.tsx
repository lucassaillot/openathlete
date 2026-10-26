import {
  useCopyStrengthWeekMutation,
  useCreateStrengthSessionMutation,
  useDeleteStrengthProgramMutation,
  useDeleteStrengthSessionMutation,
  useDeleteStrengthWeekMutation,
  useGetStrengthProgramQuery,
  useUpdateStrengthProgramMutation,
  useUpdateStrengthSessionMutation,
} from '@/api/strength';
import { ConfirmAction } from '@/components/confirm-action';
import {
  StrengthAssignDialog,
  StrengthSessionDialog,
  type StrengthSessionValues,
} from '@/components/strength';
import {
  countExercises,
  normalizeStrengthContent,
} from '@/components/strength/strength-utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { m } from '@/paraglide/messages';
import { getPath } from '@/routes/paths';
import {
  ArrowLeft,
  CalendarPlus,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { StrengthProgramSession } from '@openathlete/shared';

import { ProgramDialog } from './program-dialog';

type EditorState =
  | { mode: 'create'; weekNumber: number }
  | { mode: 'edit'; session: StrengthProgramSession };

function SessionRow({
  session,
  onOpen,
  onPlan,
}: {
  session: StrengthProgramSession;
  onOpen: () => void;
  onPlan: () => void;
}) {
  const count = countExercises(normalizeStrengthContent(session.content));
  return (
    <li className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {session.sessionNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{session.name}</span>
          <span className="block text-xs text-muted-foreground">
            {m.strength_exercise_count({ count })}
            {session.duration
              ? ` · ${Math.round(session.duration / 60)} min`
              : ''}
          </span>
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label={m.strength_plan_session()}
        title={m.strength_plan_session()}
        onClick={onPlan}
      >
        <CalendarPlus className="size-4" />
      </Button>
    </li>
  );
}

export function StrengthProgramView({ programId }: { programId: number }) {
  const navigate = useNavigate();
  const {
    data: program,
    isPending,
    isError,
  } = useGetStrengthProgramQuery(programId);
  const updateProgram = useUpdateStrengthProgramMutation();
  const deleteProgram = useDeleteStrengthProgramMutation();
  const createSession = useCreateStrengthSessionMutation();
  const updateSession = useUpdateStrengthSessionMutation();
  const deleteSession = useDeleteStrengthSessionMutation();
  const copyWeek = useCopyStrengthWeekMutation();
  const deleteWeek = useDeleteStrengthWeekMutation();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [programDialog, setProgramDialog] = useState(false);
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] =
    useState<StrengthProgramSession | null>(null);
  const [assignSessionId, setAssignSessionId] = useState<number | null>(null);

  const backLink = (
    <Link
      to={getPath(['dashboard', 'strength'])}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {m.strength_title()}
    </Link>
  );

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError || !program) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
        {backLink}
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {m.strength_program_not_found()}
        </p>
      </div>
    );
  }

  const sessions = program.sessions ?? [];
  const weekCount = program.weekCount ?? 0;
  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1);

  const onError = () => toast.error(m.strength_error());

  const handleSave = (values: StrengthSessionValues) => {
    if (!editor) return;
    if (editor.mode === 'create') {
      createSession.mutate(
        {
          programId,
          body: { weekNumber: editor.weekNumber, ...values },
        },
        { onSuccess: () => setEditor(null), onError },
      );
    } else {
      updateSession.mutate(
        {
          sessionId: editor.session.strengthProgramSessionId,
          body: values,
        },
        { onSuccess: () => setEditor(null), onError },
      );
    }
  };

  const editorTitle =
    editor?.mode === 'edit'
      ? m.strength_week_session_label({
          week: editor.session.weekNumber,
          session: editor.session.sessionNumber,
        })
      : editor
        ? m.strength_new_session_in_week({ week: editor.weekNumber })
        : '';

  return (
    <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5 p-4 md:p-8">
      {backLink}

      <header className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {program.category && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: program.category.color }}
                />
                {program.category.name}
              </span>
            )}
            <h1 className="break-words text-xl font-semibold md:text-2xl">
              {program.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {m.strength_weeks_count({ count: weekCount })} ·{' '}
              {m.strength_sessions_count({ count: sessions.length })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={m.strength_program_actions()}
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setProgramDialog(true)}>
                <Pencil className="size-4" />
                {m.strength_edit_program()}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDeleteProgram(true)}
              >
                <Trash2 className="size-4" />
                {m.strength_delete_program()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {program.description && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {program.description}
          </p>
        )}
      </header>

      {weeks.length === 0 && (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {m.strength_program_empty()}
        </p>
      )}

      {weeks.map((week) => {
        const weekSessions = sessions.filter((s) => s.weekNumber === week);
        return (
          <section
            key={week}
            className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm sm:p-4"
          >
            <header className="flex items-center justify-between gap-2 px-1">
              <h2 className="font-semibold">
                {m.strength_week_number({ week })}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {m.strength_sessions_count({ count: weekSessions.length })}
                </span>
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={m.strength_week_actions()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={weekSessions.length === 0}
                    onClick={() =>
                      copyWeek.mutate(
                        { programId, weekNumber: week },
                        {
                          onSuccess: () =>
                            toast.success(
                              m.strength_week_copied({
                                week: weekCount + 1,
                              }),
                            ),
                          onError,
                        },
                      )
                    }
                  >
                    <Copy className="size-4" />
                    {m.strength_copy_week_to_end()}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setWeekToDelete(week)}
                  >
                    <Trash2 className="size-4" />
                    {m.strength_delete_week()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            {weekSessions.length > 0 && (
              <ul className="flex flex-col gap-1">
                {weekSessions.map((session) => (
                  <SessionRow
                    key={session.strengthProgramSessionId}
                    session={session}
                    onOpen={() => setEditor({ mode: 'edit', session })}
                    onPlan={() =>
                      setAssignSessionId(session.strengthProgramSessionId)
                    }
                  />
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-fit text-primary"
              onClick={() => setEditor({ mode: 'create', weekNumber: week })}
            >
              <Plus className="size-4" />
              {m.strength_add_session()}
            </Button>
          </section>
        );
      })}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 border-dashed"
          onClick={() =>
            setEditor({ mode: 'create', weekNumber: weekCount + 1 })
          }
        >
          <Plus className="size-4" />
          {m.strength_new_week({ week: weekCount + 1 })}
        </Button>
        {weekCount > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-12 border-dashed"
            isLoading={copyWeek.isPending}
            disabled={!sessions.some((s) => s.weekNumber === weekCount)}
            onClick={() =>
              copyWeek.mutate(
                { programId, weekNumber: weekCount },
                {
                  onSuccess: () =>
                    toast.success(
                      m.strength_week_copied({ week: weekCount + 1 }),
                    ),
                  onError,
                },
              )
            }
          >
            <Copy className="size-4" />
            {m.strength_copy_last_week({ week: weekCount })}
          </Button>
        )}
      </div>
      {weekCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {m.strength_copy_week_hint()}
        </p>
      )}

      <StrengthSessionDialog
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editorTitle}
        initial={
          editor?.mode === 'edit'
            ? {
                ...editor.session,
                content: normalizeStrengthContent(editor.session.content),
              }
            : undefined
        }
        onSave={handleSave}
        onDelete={
          editor?.mode === 'edit'
            ? () => setSessionToDelete(editor.session)
            : undefined
        }
        isSaving={createSession.isPending || updateSession.isPending}
      />

      <StrengthAssignDialog
        open={assignSessionId !== null}
        onClose={() => setAssignSessionId(null)}
        programId={programId}
        sessionId={assignSessionId ?? undefined}
      />

      <ProgramDialog
        open={programDialog}
        onClose={() => setProgramDialog(false)}
        program={program}
        isSaving={updateProgram.isPending}
        onSubmit={(values) =>
          updateProgram.mutate(
            { programId, body: values },
            { onSuccess: () => setProgramDialog(false), onError },
          )
        }
      />

      <ConfirmAction
        open={confirmDeleteProgram}
        onClose={() => setConfirmDeleteProgram(false)}
        title={m.strength_delete_program()}
        message={m.strength_delete_program_confirm()}
        isLoading={deleteProgram.isPending}
        onConfirm={() =>
          deleteProgram.mutate(programId, {
            onSuccess: () => navigate(getPath(['dashboard', 'strength'])),
            onError,
          })
        }
      />

      <ConfirmAction
        open={weekToDelete !== null}
        onClose={() => setWeekToDelete(null)}
        title={m.strength_delete_week()}
        message={m.strength_delete_week_confirm({ week: weekToDelete ?? 0 })}
        isLoading={deleteWeek.isPending}
        onConfirm={() => {
          if (weekToDelete === null) return;
          deleteWeek.mutate(
            { programId, weekNumber: weekToDelete },
            { onSettled: () => setWeekToDelete(null), onError },
          );
        }}
      />

      <ConfirmAction
        open={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        title={m.strength_delete_session()}
        message={m.strength_delete_session_confirm()}
        isLoading={deleteSession.isPending}
        onConfirm={() => {
          if (!sessionToDelete) return;
          deleteSession.mutate(sessionToDelete.strengthProgramSessionId, {
            onSuccess: () => {
              setSessionToDelete(null);
              setEditor(null);
            },
            onError,
          });
        }}
      />
    </div>
  );
}
