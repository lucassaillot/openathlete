import {
  useCreateStrengthCategoryMutation,
  useCreateStrengthProgramMutation,
  useGetStrengthCategoriesQuery,
  useGetStrengthProgramsQuery,
} from '@/api/strength';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { m } from '@/paraglide/messages';
import { cn } from '@/utils/shadcn';
import { ChevronRight, Dumbbell, Plus, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { StrengthCategory, StrengthProgram } from '@openathlete/shared';

import { CategoriesDialog } from './categories-dialog';
import { SUGGESTED_CATEGORIES } from './category-color';
import { ProgramDialog } from './program-dialog';
import { programPath } from './strength-paths';

const ALL = 'all';
const NONE = 'none';

const suggestedLabel: Record<
  (typeof SUGGESTED_CATEGORIES)[number]['key'],
  () => string
> = {
  feet: () => m.strength_suggested_feet(),
  legs: () => m.strength_suggested_legs(),
  core: () => m.strength_suggested_core(),
  upper: () => m.strength_suggested_upper(),
  general: () => m.strength_suggested_general(),
};

function ProgramCard({ program }: { program: StrengthProgram }) {
  const color = program.category?.color ?? 'var(--border)';
  return (
    <Link
      to={programPath(program.strengthProgramId)}
      className="group flex min-w-0 items-stretch gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className="w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-semibold">{program.name}</span>
        <span className="text-xs text-muted-foreground">
          {m.strength_weeks_count({ count: program.weekCount ?? 0 })} ·{' '}
          {m.strength_sessions_count({ count: program.sessionCount ?? 0 })}
        </span>
        {program.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {program.description}
          </p>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function categoryLabel(category: StrengthCategory, all: StrengthCategory[]) {
  const parent = all.find(
    (c) => c.strengthCategoryId === category.parentCategoryId,
  );
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

export function StrengthView() {
  const navigate = useNavigate();
  const { data: programs, isPending } = useGetStrengthProgramsQuery();
  const { data: categories = [] } = useGetStrengthCategoriesQuery();
  const createProgram = useCreateStrengthProgramMutation();
  const createCategory = useCreateStrengthCategoryMutation();
  const [filter, setFilter] = useState(ALL);
  const [programDialog, setProgramDialog] = useState(false);
  const [categoriesDialog, setCategoriesDialog] = useState(false);

  // Parents first, each followed by its sub-categories
  const orderedCategories = useMemo(
    () => [
      ...categories
        .filter((c) => !c.parentCategoryId)
        .flatMap((parent) => [
          parent,
          ...categories.filter(
            (c) => c.parentCategoryId === parent.strengthCategoryId,
          ),
        ]),
      ...categories.filter(
        (c) =>
          c.parentCategoryId &&
          !categories.some((p) => p.strengthCategoryId === c.parentCategoryId),
      ),
    ],
    [categories],
  );

  const groups = useMemo(() => {
    const list = programs ?? [];
    const matches = (category: StrengthCategory) =>
      filter === ALL ||
      String(category.strengthCategoryId) === filter ||
      String(category.parentCategoryId) === filter;
    const result: {
      key: string;
      label: string;
      color?: string;
      programs: StrengthProgram[];
    }[] = orderedCategories.filter(matches).map((category) => ({
      key: String(category.strengthCategoryId),
      label: categoryLabel(category, categories),
      color: category.color,
      programs: list.filter(
        (p) => p.categoryId === category.strengthCategoryId,
      ),
    }));
    if (filter === ALL || filter === NONE) {
      result.push({
        key: NONE,
        label: m.strength_no_category(),
        programs: list.filter(
          (p) =>
            !p.categoryId ||
            !categories.some((c) => c.strengthCategoryId === p.categoryId),
        ),
      });
    }
    return result.filter((g) => g.programs.length > 0);
  }, [programs, orderedCategories, categories, filter]);

  const filterOptions = [
    { value: ALL, label: m.strength_all_categories() },
    ...orderedCategories.map((c) => ({
      value: String(c.strengthCategoryId),
      label: categoryLabel(c, categories),
      color: c.color,
    })),
    { value: NONE, label: m.strength_no_category() },
  ];

  const hasPrograms = (programs?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5 p-4 md:gap-6 md:p-8">
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="hidden min-w-0 md:block">
          <h1 className="text-2xl font-semibold">{m.strength_title()}</h1>
          <p className="text-sm text-muted-foreground">
            {m.strength_subtitle()}
          </p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 md:flex-none"
            onClick={() => setCategoriesDialog(true)}
          >
            <Tags className="size-4" />
            {m.strength_categories()}
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 md:flex-none"
            onClick={() => setProgramDialog(true)}
          >
            <Plus className="size-4" />
            {m.strength_new_program()}
          </Button>
        </div>
      </header>

      {hasPrograms && categories.length > 0 && (
        <>
          {/* Mobile: dropdown */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger
              className="h-12 w-full rounded-xl text-base md:hidden"
              aria-label={m.strength_category()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="h-11">
                  {'color' in o && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: o.color }}
                    />
                  )}
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Desktop: wrapping chips */}
          <div className="hidden flex-wrap gap-2 md:flex">
            {filterOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={filter === o.value}
                onClick={() => setFilter(o.value)}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  filter === o.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent',
                )}
              >
                {'color' in o && (
                  <span
                    className="size-2.5 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: o.color }}
                  />
                )}
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {isPending ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !hasPrograms ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-8 text-center md:p-12">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="size-7 text-primary" />
          </span>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold">
              {m.strength_empty_title()}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.strength_empty_description()}
            </p>
          </div>
          <Button className="h-11" onClick={() => setProgramDialog(true)}>
            <Plus className="size-4" />
            {m.strength_create_first_program()}
          </Button>
          {categories.length === 0 && (
            <div className="flex max-w-md flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {m.strength_suggested_categories()}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_CATEGORIES.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={createCategory.isPending}
                    onClick={() =>
                      createCategory.mutate({
                        name: suggestedLabel[s.key](),
                        color: s.color,
                      })
                    }
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {suggestedLabel[s.key]()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {m.strength_no_program_in_category()}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex min-w-0 flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: group.color ?? 'var(--border)' }}
              />
              {group.label}
              <span className="font-normal">· {group.programs.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {group.programs.map((program) => (
                <ProgramCard
                  key={program.strengthProgramId}
                  program={program}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <ProgramDialog
        open={programDialog}
        onClose={() => setProgramDialog(false)}
        defaultCategoryId={
          filter !== ALL && filter !== NONE ? Number(filter) : null
        }
        isSaving={createProgram.isPending}
        onSubmit={(values) =>
          createProgram.mutate(values, {
            onSuccess: (program) => {
              setProgramDialog(false);
              navigate(programPath(program.strengthProgramId));
            },
            onError: () => toast.error(m.strength_error()),
          })
        }
      />
      <CategoriesDialog
        open={categoriesDialog}
        onClose={() => setCategoriesDialog(false)}
      />
    </div>
  );
}
