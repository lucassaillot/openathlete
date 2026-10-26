import { useUpdateEventMutation } from '@/api/event';
import { m } from '@/paraglide/messages';
import { Check, Copy, Dumbbell, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EVENT_TYPE, TrainingEvent } from '@openathlete/shared';

import { StrengthContentView, StrengthSessionDialog } from '../strength';
import {
  normalizeStrengthContent,
  strengthContentToText,
} from '../strength/strength-utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function StrengthSessionDetails({ event }: { event: TrainingEvent }) {
  const updateEvent = useUpdateEventMutation();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const content = normalizeStrengthContent(event.strengthContent);
  const origin = event.strengthSession;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        [event.name, event.description, strengthContentToText(content)]
          .filter(Boolean)
          .join('\n\n'),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(m.strength_error());
    }
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-4 text-primary" />
            {m.strength_session_card_title()}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span className="hidden sm:inline">{m.strength_copy_text()}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              {m.strength_edit()}
            </Button>
          </div>
        </div>
        {origin?.program && (
          <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <span className="truncate">{origin.program.name}</span>
            <span className="shrink-0">
              ·{' '}
              {m.strength_week_session_label({
                week: origin.weekNumber,
                session: origin.sessionNumber,
              })}
            </span>
          </span>
        )}
      </CardHeader>
      <CardContent>
        <StrengthContentView content={content} />
      </CardContent>

      <StrengthSessionDialog
        open={editing}
        onClose={() => setEditing(false)}
        title={m.strength_edit_planned_session()}
        description={m.strength_edit_planned_session_description()}
        contentOnly
        initial={{ content }}
        isSaving={updateEvent.isPending}
        onSave={(values) =>
          updateEvent.mutate(
            {
              eventId: event.eventId,
              body: {
                type: EVENT_TYPE.TRAINING,
                strengthContent: values.content,
              },
            },
            {
              onSuccess: () => setEditing(false),
              onError: () => toast.error(m.strength_error()),
            },
          )
        }
      />
    </Card>
  );
}
