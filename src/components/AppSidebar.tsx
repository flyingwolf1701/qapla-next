
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, History, Settings, BarChart3, Zap } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { Separator } from './ui/separator';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/workout/setup', label: 'New Workout', icon: PlusSquare },
  { href: '/history', label: 'History', icon: History },
  // { href: '/stats', label: 'Stats', icon: BarChart3 }, // Future
  // { href: '/settings', label: 'Settings', icon: Settings }, // Future
];

export function AppSidebar() {
  const pathname = usePathname();
  const { clearCurrentWorkout } = useWorkoutState();

  const handleNewWorkoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname.startsWith('/workout/session')) {
        if(!confirm("Starting a new workout will end your current session. Are you sure?")) {
            e.preventDefault();
            return;
        }
    }
    clearCurrentWorkout();
  };


  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={item.href === '/workout/setup' ? handleNewWorkoutClick : undefined}
                >
                  <a>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <Separator className="my-2" />
         <p className="text-xs text-center text-muted-foreground p-2 group-data-[collapsible=icon]:hidden">
            Success is showing up!
          </p>
      </SidebarFooter>
    </Sidebar>
  );
}
