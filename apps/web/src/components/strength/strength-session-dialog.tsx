import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { m } from '@/paraglide/messages';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import type { StrengthContent } from '@openathlete/shared';

import { StrengthContentEditor } from './strength-content-editor';
import { StrengthContentView } from './strength-content-view';
import { EMPTY_STRENGTH_CONTENT } from './strength-utils';

export interface StrengthSessionValues {
  name: string;
  notes: string;
  /** seconds */
  duration: number | null;
  content: StrengthContent;
}

interface P {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  initial?: Partial<StrengthSessionValues>;
  /** Hide name/notes/duration (e.g. editing a calendar event's content). */
  contentOnly?: boolean;
  onSave: (values: StrengthSessionValues) => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

export function StrengthSessionDialog({
  open,
  onClose,
  title,
  description,
  initial,
  contentOnly,
  onSave,
  onDelete,
  isSaving,
}: P) {
  const nameId = useId();
  const durationId = useId();
  const notesId = useId();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [minutes, setMinutes] = useState('');
  const [content, setContent] = useState<StrengthContent>(
    EMPTY_STRENGTH_CONTENT,
  );
  const [preview, setPreview] = useState(false);

  // Reset the form each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setNotes(initial?.notes ?? '');
    setMinutes(
      initial?.duration ? String(Math.round(initial.duration / 60)) : '',
    );
    setContent(initial?.content ?? EMPTY_STRENGTH_CONTENT);
    setPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSave = contentOnly || name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const parsedMinutes = Number(minutes.replace(',', '.'));
    onSave({
      name: name.trim(),
      notes,
      duration:
        minutes && Number.isFinite(parsedMinutes) && parsedMinutes > 0
          ? Math.round(parsedMinutes * 60)
          : null,
      content,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 pt-2">
          {!contentOnly && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium">
                  {m.strength_session_name()}
                </label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={m.strength_session_name_placeholder()}
                  className="h-11 text-base"
                  autoFocus
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={durationId} className="text-sm font-medium">
                  {m.strength_session_duration()}
                </label>
                <div className="relative">
                  <Input
                    id={durationId}
                    inputMode="numeric"
                    value={minutes}
                    onChange={(e) =>
                      setMinutes(e.target.value.replace(/[^\d.,]/g, ''))
                    }
                    placeholder="45"
                    className="h-11 pr-12 text-base"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={notesId} className="text-sm font-medium">
                  {m.strength_session_notes()}
                </label>
                <Textarea
                  id={notesId}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={m.strength_session_notes_placeholder()}
                  className="min-h-16"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{m.strength_exercises()}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? (
                <Pencil className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {preview ? m.strength_edit() : m.strength_preview()}
            </Button>
          </div>

          {preview ? (
            <div className="rounded-xl border p-3">
              <StrengthContentView content={content} />
            </div>
          ) : (
            <StrengthContentEditor value={content} onChange={setContent} />
          )}

          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="w-fit text-destructive hover:text-destructive sm:hidden"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              {m.strength_delete_session()}
            </Button>
          )}

          <div className="sticky bottom-0 -mx-1 grid grid-cols-2 gap-2 border-t bg-background px-1 pt-3 pb-1 sm:flex sm:items-center sm:border-t-0">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="hidden text-destructive hover:text-destructive sm:mr-auto sm:inline-flex"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                {m.strength_delete_session()}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 sm:ml-auto sm:h-9"
            >
              {m.cancel()}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              isLoading={isSaving}
              className="h-11 sm:h-9"
            >
              {m.strength_save()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
