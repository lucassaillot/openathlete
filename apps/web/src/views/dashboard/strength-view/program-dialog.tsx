import { useGetStrengthCategoriesQuery } from '@/api/strength';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { m } from '@/paraglide/messages';
import { useEffect, useId, useState } from 'react';

import type { StrengthProgram } from '@openathlete/shared';

const NO_CATEGORY = 'none';

export interface ProgramFormValues {
  name: string;
  description: string;
  categoryId: number | null;
}

export function ProgramDialog({
  open,
  onClose,
  program,
  defaultCategoryId,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  program?: StrengthProgram;
  defaultCategoryId?: number | null;
  onSubmit: (values: ProgramFormValues) => void;
  isSaving?: boolean;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const { data: categories = [] } = useGetStrengthCategoriesQuery();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(NO_CATEGORY);

  useEffect(() => {
    if (!open) return;
    setName(program?.name ?? '');
    setDescription(program?.description ?? '');
    const categoryId = program ? program.categoryId : defaultCategoryId;
    setCategory(categoryId ? String(categoryId) : NO_CATEGORY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {program ? m.strength_edit_program() : m.strength_new_program()}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex min-w-0 flex-col gap-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSubmit({
              name: name.trim(),
              description,
              categoryId: category === NO_CATEGORY ? null : Number(category),
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className="text-sm font-medium">
              {m.strength_program_name()}
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.strength_program_name_placeholder()}
              className="h-11 text-base"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{m.strength_category()}</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="h-11 w-full"
                aria-label={m.strength_category()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>
                  {m.strength_no_category()}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem
                    key={c.strengthCategoryId}
                    value={String(c.strengthCategoryId)}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={descriptionId} className="text-sm font-medium">
              {m.strength_program_description()}
            </label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={m.strength_program_description_placeholder()}
              className="min-h-24"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={!name.trim()} isLoading={isSaving}>
              {program ? m.strength_save() : m.strength_create_program()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
