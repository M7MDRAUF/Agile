import {
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
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "./nav-config";

/**
 * Maps serializable nav icon names to lucide components. Shared by the desktop
 * <Sidebar/> and the mobile <MobileNav/> so the icon set stays in sync.
 */
export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
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
