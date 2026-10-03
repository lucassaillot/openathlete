import {
  type AdminUser,
  useAdminStatsQuery,
  useAdminUsersQuery,
} from '@/api/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
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
import { getPath } from '@/routes/paths';
import { startImpersonation } from '@/utils/impersonation';
import { LogIn, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

const SEARCH_DEBOUNCE_MS = 300;

export function AdminView() {
  const { user } = useAuthContext();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const isAdmin = Boolean(user?.isAdmin && !user.impersonatedBy);
  const { data: stats } = useAdminStatsQuery(isAdmin);
  const { data: usersPage, isPending } = useAdminUsersQuery(
    search,
    page,
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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

      <div className="relative w-full md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={m.admin_search_placeholder()}
          className="pl-9"
        />
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <div className="flex justify-center">
                      <Loader />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isPending && usersPage?.users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        row.userId === user?.userId || impersonatingId !== null
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
    </div>
  );
}
