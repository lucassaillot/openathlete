import {
  type AdminUser,
  type AdminUsersSort,
  useAdminLoginEventsQuery,
  useAdminStatsQuery,
  useAdminUsersQuery,
} from '@/api/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthContext } from '@/contexts/auth';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { getPath } from '@/routes/paths';
import { startImpersonation } from '@/utils/impersonation';
import { History, LogIn, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

const SEARCH_DEBOUNCE_MS = 300;
// Keep in sync with the API's "online" window (admin.service.ts).
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

function formatRelative(date: string | null): string {
  if (!date) return m.admin_never();
  const diff = new Date(date).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, 'minute');
}

function isOnline(lastSeenAt: string | null): boolean {
  return (
    !!lastSeenAt &&
    Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
  );
}

function LoginHistoryDialog({
  target,
  onClose,
}: {
  target: AdminUser | null;
  onClose: () => void;
}) {
  const { data: events, isPending } = useAdminLoginEventsQuery(
    target?.userId ?? null,
  );

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {m.admin_login_history_title({
              name: `${target?.firstName ?? ''} ${target?.lastName ?? ''}`.trim(),
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isPending ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : !events?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              {m.admin_login_history_empty()}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.admin_login_col_date()}</TableHead>
                    <TableHead>{m.admin_login_col_method()}</TableHead>
                    <TableHead>{m.admin_login_col_ip()}</TableHead>
                    <TableHead>{m.admin_login_col_device()}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.loginEventId}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.method === 'PASSWORD'
                            ? m.admin_login_method_password()
                            : m.admin_login_method_oauth()}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {event.ipAddress ?? '—'}
                      </TableCell>
                      <TableCell
                        className="max-w-64 truncate text-xs text-muted-foreground"
                        title={event.userAgent ?? undefined}
                      >
                        {event.userAgent ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function AdminView() {
  const { user } = useAuthContext();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AdminUsersSort>('createdAt');
  const [historyTarget, setHistoryTarget] = useState<AdminUser | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const isAdmin = Boolean(user?.isAdmin && !user.impersonatedBy);
  const { data: stats } = useAdminStatsQuery(isAdmin);
  const { data: usersPage, isPending } = useAdminUsersQuery(
    search,
    page,
    sort,
    isAdmin,
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  if (!isAdmin) {
    return <Navigate to={getPath(['dashboard'])} replace />;
  }

  const handleImpersonate = async (target: AdminUser) => {
    setImpersonatingId(target.userId);
    try {
      await startImpersonation(target.userId);
    } catch {
      toast.error(m.admin_impersonate_error());
      setImpersonatingId(null);
    }
  };

  const statCards = [
    { label: m.admin_stat_online(), value: stats?.onlineNow },
    { label: m.admin_stat_active_24h(), value: stats?.activeLast24Hours },
    { label: m.admin_stat_active_7d(), value: stats?.activeLast7Days },
    { label: m.admin_stat_users(), value: stats?.users },
    { label: m.admin_stat_coaches(), value: stats?.coaches },
    { label: m.admin_stat_athletes(), value: stats?.athletes },
    { label: m.admin_stat_new_users(), value: stats?.newUsersLast30Days },
    { label: m.admin_stat_events(), value: stats?.eventsLast7Days },
  ];

  const pages = usersPage
    ? Math.max(1, Math.ceil(usersPage.total / usersPage.pageSize))
    : 1;

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{m.admin_title()}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardTitle className="truncate text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 text-2xl font-semibold">
              {stat.value ?? '—'}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={m.admin_search_placeholder()}
            className="pl-9"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as AdminUsersSort);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{m.admin_sort_created()}</SelectItem>
            <SelectItem value="lastSeenAt">
              {m.admin_sort_last_seen()}
            </SelectItem>
            <SelectItem value="lastLoginAt">
              {m.admin_sort_last_login()}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_col_user()}</TableHead>
                <TableHead>{m.admin_col_roles()}</TableHead>
                <TableHead className="text-right">
                  {m.admin_col_athletes()}
                </TableHead>
                <TableHead>{m.admin_col_created()}</TableHead>
                <TableHead>{m.admin_col_last_seen()}</TableHead>
                <TableHead>{m.admin_col_last_login()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <div className="flex justify-center">
                      <Loader />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isPending && usersPage?.users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {m.admin_no_users()}
                  </TableCell>
                </TableRow>
              )}
              {usersPage?.users.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 font-medium">
                        {row.firstName} {row.lastName}
                        {row.isAdmin && (
                          <Badge variant="secondary">{m.admin_badge()}</Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.email}
                      </span>
                      {!row.onboardingCompleted && (
                        <span className="text-xs text-amber-600">
                          {m.admin_onboarding_pending()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role === 'COACH' ? m.coach() : m.athlete()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.coachedAthletesCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap"
                    title={
                      row.lastSeenAt
                        ? new Date(row.lastSeenAt).toLocaleString()
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-2">
                      {isOnline(row.lastSeenAt) && (
                        <span
                          className="h-2 w-2 rounded-full bg-green-500"
                          aria-label={m.admin_online()}
                        />
                      )}
                      <span
                        className={
                          isOnline(row.lastSeenAt)
                            ? undefined
                            : 'text-muted-foreground'
                        }
                      >
                        {formatRelative(row.lastSeenAt)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={
                      row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleString()
                        : undefined
                    }
                  >
                    {formatRelative(row.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryTarget(row)}
                        title={m.admin_login_history()}
                      >
                        <History className="h-4 w-4" />
                        <span className="sr-only">
                          {m.admin_login_history()}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          row.userId === user?.userId ||
                          impersonatingId !== null
                        }
                        onClick={() => handleImpersonate(row)}
                      >
                        {impersonatingId === row.userId ? (
                          <Loader size="sm" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        {m.admin_impersonate()}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-muted-foreground">
            {m.admin_page_info({ page, pages })}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {m.admin_previous()}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            {m.admin_next()}
          </Button>
        </div>
      )}

      <LoginHistoryDialog
        target={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
