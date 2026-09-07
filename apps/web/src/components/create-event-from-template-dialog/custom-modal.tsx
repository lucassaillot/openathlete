import { XIcon } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '../ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function CustomModal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 flex min-w-0 w-[calc(100%-2rem)] max-w-5xl max-h-[calc(100dvh-2.5rem)] flex-col rounded-lg border border-border bg-background shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xs opacity-70 hover:opacity-100"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 overflow-x-clip overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
