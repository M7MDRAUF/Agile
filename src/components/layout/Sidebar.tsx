"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hexagon,
  LayoutDashboard,
  CircleUser,
  FolderKanban,
  ListTodo,
  CalendarRange,
  Columns3,
  SquareKanban,
  Users,
  UsersRound,
  FlaskConical,
  BarChart3,
  Bell,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { type NavSection, type NavIconName } from "./nav-config";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  "my-work": CircleUser,
  projects: FolderKanban,
  "work-items": ListTodo,
  backlog: ListTodo,
  sprints: CalendarRange,
  scrum: Columns3,
  kanban: SquareKanban,
  qa: FlaskConical,
  reports: BarChart3,
  teams: UsersRound,
  users: Users,
  notifications: Bell,
  settings: Settings,
  admin: Shield,
};

export function Sidebar({
  sections,
  defaultCollapsed = false,
}: {
  sections: NavSection[];
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5 text-white">
        <Hexagon className="size-6 shrink-0 text-primary" />
        {!collapsed ? <span className="text-lg font-bold">AgileForge</span> : null}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Primary">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed ? (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/75">
                {section.title}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!collapsed ? item.label : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
