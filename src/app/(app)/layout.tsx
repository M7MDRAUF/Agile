import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { isRole, type Role } from "@/lib/domain/constants";
import { parsePreferences } from "@/lib/domain/user-settings";
import { NAV_SECTIONS } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppearanceApplier } from "@/components/settings/AppearanceApplier";
import { cn } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isRole(user.role)) {
    redirect("/login");
  }
  const role = user.role as Role;

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(role, item.permission)),
  })).filter((section) => section.items.length > 0);

  const [unreadCount, appearanceRow] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.userSetting.findUnique({
      where: { userId_key: { userId: user.id, key: "appearance" } },
    }),
  ]);
  const appearance = parsePreferences("appearance", appearanceRow?.value);

  const shellClass = cn(
    "flex h-screen overflow-hidden",
    appearance.theme === "dark" && "dark",
    appearance.density === "compact" && "density-compact",
    appearance.reduceMotion && "reduce-motion",
    appearance.highContrast && "high-contrast",
  );

  return (
    <div className={shellClass} id="app-shell">
      <AppearanceApplier theme={appearance.theme} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <Sidebar sections={sections} defaultCollapsed={appearance.sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{ name: user.name, email: user.email, role, avatarColor: user.avatarColor }}
          unreadCount={unreadCount}
        />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
