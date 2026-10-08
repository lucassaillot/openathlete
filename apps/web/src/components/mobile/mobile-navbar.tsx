import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages';
import { getPath } from '@/routes/paths';
import { cn } from '@/utils/shadcn';
import { Calculator, Calendar, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: typeof Calendar;
  path: string;
}

const navItems: NavItem[] = [
  {
    label: m.calendar(),
    icon: Calendar,
    path: getPath(['dashboard', 'calendar']),
  },
  {
    label: m.profile(),
    icon: User,
    path: getPath(['dashboard', 'profile']),
  },
  {
    label: m.calculator(),
    icon: Calculator,
    path: getPath(['dashboard', 'calculator']),
  },
];

export function MobileNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <div className="grid grid-cols-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Button
              key={item.path}
              variant="ghost"
              // `px-1` overrides the default size variant's `px-4` — on a
              // 320px phone, 3 columns of ~107px each minus 32px of
              // padding left "Calendrier" with no room to render.
              className={cn(
                'flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-none px-1',
                isActive && 'bg-muted',
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span
                className={cn(
                  'w-full truncate text-center text-[11px]',
                  isActive
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
