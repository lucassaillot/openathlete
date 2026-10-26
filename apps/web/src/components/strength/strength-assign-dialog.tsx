import {
  useGetMyAthleteQuery,
  useGetMyCoachedAthletesQuery,
} from '@/api/athlete';
import {
  useAssignStrengthSessionMutation,
  useGetStrengthProgramQuery,
  useGetStrengthProgramsQuery,
} from '@/api/strength';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { m } from '@/paraglide/messages';
import { getPath } from '@/routes/paths';
import { cn } from '@/utils/shadcn';
import { Dumbbell } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { countExercises, normalizeStrengthContent } from './strength-utils';

interface P {
  open: boolean;
  onClose: () => void;
  /** Pre-selected day (from the calendar) */
  date?: Date;
  /** Pre-selected athlete (from an athlete's calendar) */
  athleteId?: number;
  /** Pre-selected program/session (from the program page) */
  programId?: number;
  sessionId?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Labeled({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function StrengthAssignDialog({
  open,
  onClose,
  date,
  athleteId,
  programId: fixedProgramId,
  sessionId: fixedSessionId,
}: P) {
  const dateId = useId();
  const timeId = useId();
  const { data: programs = [], isPending: loadingPrograms } =
    useGetStrengthProgramsQuery();
  const { data: myAthlete } = useGetMyAthleteQuery();
  const { data: coachedAthletes = [] } = useGetMyCoachedAthletesQuery();
  const assign = useAssignStrengthSessionMutation();

  const [programId, setProgramId] = useState<number | undefined>();
  const [week, setWeek] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [targetAthleteId, setTargetAthleteId] = useState<string>('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('18:00');

  const { data: program } = useGetStrengthProgramQuery(programId);

  useEffect(() => {
    if (!open) return;
    setProgramId(fixedProgramId);
    setSessionId(fixedSessionId);
    setWeek(undefined);
    setDay(toDateInput(date ?? new Date()));
    setTargetAthleteId(athleteId ? String(athleteId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Default the athlete to "me" when nothing is imposed
  useEffect(() => {
    if (open && !targetAthleteId && !athleteId) {
      const first = myAthlete?.athleteId ?? coachedAthletes[0]?.athleteId;
      if (first) setTargetAthleteId(String(first));
    }
  }, [open, targetAthleteId, athleteId, myAthlete, coachedAthletes]);

  const sessions = useMemo(() => program?.sessions ?? [], [program]);
  const weeks = useMemo(
    () => [...new Set(sessions.map((s) => s.weekNumber))].sort((a, b) => a - b),
    [sessions],
  );

  // Pick the week of a pre-selected session, else the first week
  useEffect(() => {
    if (week !== undefined || weeks.length === 0) return;
    const fixed = sessions.find(
      (s) => s.strengthProgramSessionId === fixedSessionId,
    );
    setWeek(fixed?.weekNumber ?? weeks[0]);
  }, [weeks, sessions, week, fixedSessionId]);

  const weekSessions = sessions.filter((s) => s.weekNumber === week);
  const selectedSession = sessions.find(
    (s) => s.strengthProgramSessionId === sessionId,
  );

  const athleteOptions = [
    ...(myAthlete ? [{ id: myAthlete.athleteId, label: m.strength_me() }] : []),
    ...coachedAthletes
      .filter((a) => a.athleteId !== myAthlete?.athleteId)
      .map((a) => ({
        id: a.athleteId,
        label: `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.trim(),
      })),
  ];

  const canSubmit = Boolean(sessionId && day && time && targetAthleteId);

  const handleSubmit = () => {
    if (!sessionId || !canSubmit) return;
    const [h, min] = time.split(':').map(Number);
    const [y, mo, d] = day.split('-').map(Number);
    const startDate = new Date(y, mo - 1, d, h || 0, min || 0);
    assign.mutate(
      {
        sessionId,
        body: { startDate, athleteId: Number(targetAthleteId) },
      },
      {
        onSuccess: () => {
          toast.success(m.strength_session_planned());
          onClose();
        },
        onError: () => toast.error(m.strength_session_plan_failed()),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            {m.strength_plan_session()}
          </DialogTitle>
          <DialogDescription>
            {m.strength_plan_session_description()}
          </DialogDescription>
        </DialogHeader>

        {!loadingPrograms && programs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {m.strength_no_program_yet()}
            </p>
            <Button asChild>
              <Link to={getPath(['dashboard', 'strength'])} onClick={onClose}>
                {m.strength_create_program()}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4 pt-2">
            {!fixedSessionId && (
              <>
                <Labeled label={m.strength_program()}>
                  <Select
                    value={programId ? String(programId) : ''}
                    onValueChange={(v) => {
                      setProgramId(Number(v));
                      setWeek(undefined);
                      setSessionId(undefined);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={m.strength_pick_program()} />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem
                          key={p.strengthProgramId}
                          value={String(p.strengthProgramId)}
                        >
                          {p.name}
                          {p.category && (
                            <span className="text-muted-foreground">
                              · {p.category.name}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>

                {programId && weeks.length > 0 && (
                  <Labeled label={m.strength_week()}>
                    <Select
                      value={week ? String(week) : ''}
                      onValueChange={(v) => {
                        setWeek(Number(v));
                        setSessionId(undefined);
                      }}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weeks.map((w) => (
                          <SelectItem key={w} value={String(w)}>
                            {m.strength_week_number({ week: w })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Labeled>
                )}

                {programId && program && weeks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {m.strength_program_has_no_session()}
                  </p>
                )}

                {weekSessions.length > 0 && (
                  <Labeled label={m.strength_session()}>
                    <div className="flex flex-col gap-2" role="radiogroup">
                      {weekSessions.map((s) => {
                        const active = s.strengthProgramSessionId === sessionId;
                        const count = countExercises(
                          normalizeStrengthContent(s.content),
                        );
                        return (
                          <button
                            key={s.strengthProgramSessionId}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() =>
                              setSessionId(s.strengthProgramSessionId)
                            }
                            className={cn(
                              'flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                              active
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'hover:bg-accent',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                active
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted',
                              )}
                            >
                              {s.sessionNumber}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {s.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {m.strength_exercise_count({ count })}
                                {s.duration
                                  ? ` · ${Math.round(s.duration / 60)} min`
                                  : ''}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Labeled>
                )}
              </>
            )}

            {fixedSessionId && selectedSession && (
              <div className="rounded-xl bg-muted/60 p-3 text-sm">
                <span className="font-medium">
                  {m.strength_week_session_label({
                    week: selectedSession.weekNumber,
                    session: selectedSession.sessionNumber,
                  })}
                </span>{' '}
                · {selectedSession.name}
              </div>
            )}

            {!athleteId && athleteOptions.length > 0 && (
              <Labeled label={m.strength_athlete()}>
                <Select
                  value={targetAthleteId}
                  onValueChange={setTargetAthleteId}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder={m.strength_pick_athlete()} />
                  </SelectTrigger>
                  <SelectContent>
                    {athleteOptions.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Labeled label={m.strength_date()} htmlFor={dateId}>
                <Input
                  id={dateId}
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-11"
                />
              </Labeled>
              <Labeled label={m.strength_time()} htmlFor={timeId}>
                <Input
                  id={timeId}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11"
                />
              </Labeled>
            </div>

            <Button
              type="button"
              className="h-11"
              onClick={handleSubmit}
              disabled={!canSubmit}
              isLoading={assign.isPending}
            >
              {m.strength_add_to_calendar()}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
