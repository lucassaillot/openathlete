'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useSpaceContext } from '@/contexts/space';
import { SIDEBAR_OPEN_STATES, getItem, setItem } from '@/utils/local-storage';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { UserRole } from '@openathlete/shared';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    spaces?: UserRole[];
    /** unread counter shown next to the entry */
    badge?: number;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
    }[];
  }[];
}) {
  const { space } = useSpaceContext();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  // Icon-only sidebar: sub-menus can't unfold inline, show them in a flyout.
  const isIconOnly = state === 'collapsed' && !isMobile;

  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    const stored = getItem(SIDEBAR_OPEN_STATES);
    return stored ? JSON.parse(stored) : {};
  });

  const handleOpenChange = (itemTitle: string, isOpen: boolean) => {
    const newStates = { ...openStates, [itemTitle]: isOpen };
    setOpenStates(newStates);
    setItem(SIDEBAR_OPEN_STATES, JSON.stringify(newStates));
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a link
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items
          .filter((item) => !item.spaces || item.spaces.includes(space))
          .map((item) =>
            item.items && isIconOnly ? (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.items.some(
                        (subItem) => pathname === subItem.url,
                      )}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="min-w-48"
                  >
                    <DropdownMenuLabel className="truncate">
                      {item.title}
                    </DropdownMenuLabel>
                    {item.items.map((subItem) => (
                      <DropdownMenuItem key={subItem.title} asChild>
                        <Link
                          to={subItem.url}
                          className={
                            pathname === subItem.url ? 'font-bold' : ''
                          }
                        >
                          {subItem.icon && <subItem.icon />}
                          <span>{subItem.title}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) : item.items ? (
              <Collapsible
                key={item.title}
                asChild
                open={openStates[item.title] ?? true}
                onOpenChange={(isOpen) => handleOpenChange(item.title, isOpen)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={item.isActive ? 'active-class' : ''}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              to={subItem.url}
                              onClick={handleLinkClick}
                              className={
                                pathname === subItem.url ? 'font-bold' : ''
                              }
                            >
                              {subItem.icon && <subItem.icon />}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url}
                >
                  <Link
                    to={item.url || '#'}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2 ${
                      pathname === item.url ? 'font-bold' : ''
                    }`}
                  >
                    {item.icon && (
                      <span className="relative flex shrink-0">
                        <item.icon className="size-4" />
                        {!!item.badge && isIconOnly && (
                          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                        )}
                      </span>
                    )}
                    <span className="truncate">{item.title}</span>
                    {!!item.badge && (
                      <UnreadBadge count={item.badge} className="ml-auto" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
