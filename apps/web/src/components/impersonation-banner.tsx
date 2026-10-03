import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/auth';
import { m } from '@/paraglide/messages';
import { stopImpersonation } from '@/utils/impersonation';
import { Eye } from 'lucide-react';

/** Shown while an admin browses the app as another user (read-only). */
export function ImpersonationBanner() {
  const { user } = useAuthContext();

  if (!user?.impersonatedBy) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950">
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {m.impersonation_banner({
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          })}
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-950/30 bg-amber-50 text-amber-950 hover:bg-amber-100"
        onClick={stopImpersonation}
      >
        {m.impersonation_stop()}
      </Button>
    </div>
  );
}
