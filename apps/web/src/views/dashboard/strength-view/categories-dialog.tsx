import {
  useCreateStrengthCategoryMutation,
  useDeleteStrengthCategoryMutation,
  useGetStrengthCategoriesQuery,
  useUpdateStrengthCategoryMutation,
} from '@/api/strength';
import { ConfirmAction } from '@/components/confirm-action';
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
import { cn } from '@/utils/shadcn';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { StrengthCategory } from '@openathlete/shared';

import { CATEGORY_COLORS } from './category-color';

const NO_PARENT = 'none';

function CategoryForm({
  categories,
  initial,
  onSubmit,
  onCancel,
  isSaving,
}: {
  categories: StrengthCategory[];
  initial?: StrengthCategory;
  onSubmit: (values: {
    name: string;
    color: string;
    parentCategoryId: number | null;
  }) => void;
  onCancel?: () => void;
  isSaving?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [parent, setParent] = useState(
    initial?.parentCategoryId ? String(initial.parentCategoryId) : NO_PARENT,
  );

  const parents = categories.filter(
    (c) =>
      c.strengthCategoryId !== initial?.strengthCategoryId &&
      // keep a single level of nesting: a parent cannot itself be a child
      !c.parentCategoryId,
  );

  return (
    <form
      className="flex min-w-0 flex-col gap-3 rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          color,
          parentCategoryId: parent === NO_PARENT ? null : Number(parent),
        });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={m.strength_category_name_placeholder()}
        aria-label={m.strength_category_name()}
        className="h-11"
        autoFocus={!!initial}
      />
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
              color === c && 'ring-2 ring-foreground',
            )}
            style={{ backgroundColor: c }}
          >
            {color === c && <Check className="size-4 text-white" />}
          </button>
        ))}
      </div>
      {parents.length > 0 && (
        <Select value={parent} onValueChange={setParent}>
          <SelectTrigger
            className="h-11 w-full"
            aria-label={m.strength_parent_category()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PARENT}>
              {m.strength_no_parent_category()}
            </SelectItem>
            {parents.map((c) => (
              <SelectItem
                key={c.strengthCategoryId}
                value={String(c.strengthCategoryId)}
              >
                {m.strength_sub_category_of({ name: c.name })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {m.cancel()}
          </Button>
        )}
        <Button type="submit" disabled={!name.trim()} isLoading={isSaving}>
          {initial ? m.strength_save() : m.strength_add_category()}
        </Button>
      </div>
    </form>
  );
}

export function CategoriesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: categories = [] } = useGetStrengthCategoriesQuery();
  const create = useCreateStrengthCategoryMutation();
  const update = useUpdateStrengthCategoryMutation();
  const remove = useDeleteStrengthCategoryMutation();
  const [editing, setEditing] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<StrengthCategory | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Parents first, each followed by its sub-categories
  const ordered = categories
    .filter((c) => !c.parentCategoryId)
    .flatMap((parent) => [
      parent,
      ...categories.filter(
        (c) => c.parentCategoryId === parent.strengthCategoryId,
      ),
    ]);
  const orphans = categories.filter(
    (c) =>
      c.parentCategoryId &&
      !categories.some((p) => p.strengthCategoryId === c.parentCategoryId),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.strength_manage_categories()}</DialogTitle>
          <DialogDescription>
            {m.strength_manage_categories_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 pt-2">
          <CategoryForm
            key={formKey}
            categories={categories}
            isSaving={create.isPending}
            onSubmit={(values) =>
              create.mutate(values, {
                onSuccess: () => setFormKey((k) => k + 1),
                onError: () => toast.error(m.strength_error()),
              })
            }
          />

          <ul className="flex flex-col divide-y">
            {[...ordered, ...orphans].map((category) =>
              editing === category.strengthCategoryId ? (
                <li key={category.strengthCategoryId} className="py-2">
                  <CategoryForm
                    categories={categories}
                    initial={category}
                    isSaving={update.isPending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(values) =>
                      update.mutate(
                        {
                          categoryId: category.strengthCategoryId,
                          body: values,
                        },
                        {
                          onSuccess: () => setEditing(null),
                          onError: () => toast.error(m.strength_error()),
                        },
                      )
                    }
                  />
                </li>
              ) : (
                <li
                  key={category.strengthCategoryId}
                  className={cn(
                    'flex min-w-0 items-center gap-3 py-2',
                    category.parentCategoryId && 'pl-6',
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {category.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={m.strength_edit()}
                    onClick={() => setEditing(category.strengthCategoryId)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 hover:text-destructive"
                    aria-label={m.strength_remove()}
                    onClick={() => setToDelete(category)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ),
            )}
          </ul>
        </div>
      </DialogContent>

      <ConfirmAction
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={m.strength_delete_category()}
        message={m.strength_delete_category_confirm({
          name: toDelete?.name ?? '',
        })}
        isLoading={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.strengthCategoryId, {
            onSettled: () => setToDelete(null),
          });
        }}
      />
    </Dialog>
  );
}
