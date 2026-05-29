import type { Permission } from "@/lib/domain/permissions";

// Icon names are stored as strings (not component references) so that the
// permission-filtered nav can be passed from a Server Component (the app
// layout) to the Client Component <Sidebar/> without crossing the server/
// client boundary with non-serializable function values. The Sidebar maps
// these names back to lucide icons.
export type NavIconName =
  | "dashboard"
  | "my-work"
  | "projects"
  | "work-items"
  | "backlog"
  | "sprints"
  | "scrum"
  | "kanban"
  | "qa"
  | "reports"
  | "teams"
  | "users"
  | "notifications"
  | "settings"
  | "admin";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  permission?: Permission;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "My Work", href: "/my-work", icon: "my-work" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { label: "Projects", href: "/projects", icon: "projects", permission: "project.view" },
      { label: "Work Items", href: "/work-items", icon: "work-items", permission: "workitem.view" },
      { label: "Backlog", href: "/backlog", icon: "backlog", permission: "workitem.view" },
      { label: "Sprints", href: "/sprints", icon: "sprints", permission: "sprint.view" },
      { label: "Scrum Board", href: "/boards/scrum", icon: "scrum", permission: "workitem.view" },
      {
        label: "Kanban Board",
        href: "/boards/kanban",
        icon: "kanban",
        permission: "workitem.view",
      },
    ],
  },
  {
    title: "Quality & Insights",
    items: [
      { label: "QA", href: "/qa", icon: "qa", permission: "qa.view" },
      { label: "Reports", href: "/reports", icon: "reports", permission: "report.view" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Teams", href: "/teams", icon: "teams", permission: "team.view" },
      { label: "Users", href: "/users", icon: "users", permission: "user.view" },
      {
        label: "Notifications",
        href: "/notifications",
        icon: "notifications",
        permission: "notification.view",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: "settings",
        permission: "settings.manage_profile",
      },
      { label: "Admin", href: "/admin", icon: "admin", permission: "admin.access" },
    ],
  },
];
