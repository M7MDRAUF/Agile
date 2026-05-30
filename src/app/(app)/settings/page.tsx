import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { ROLE_LABELS } from "@/lib/domain/constants";
import { getUserPreferences, getWorkspaceSettings } from "@/lib/actions/settings";
import { getIntegrations } from "@/lib/actions/integrations";
import { isWorkspaceActive } from "@/lib/actions/danger";
import { describeUserAgent } from "@/lib/domain/user-agent";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { SettingsShell, type SettingsTab } from "@/components/settings/SettingsShell";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { MfaSection } from "@/components/settings/MfaSection";
import { SessionsSection, type SessionRow } from "@/components/settings/SessionsSection";
import { NotificationPrefsForm } from "@/components/settings/NotificationPrefsForm";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { LocalizationForm } from "@/components/settings/LocalizationForm";
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm";
import { RolesMatrix } from "@/components/settings/RolesMatrix";
import {
  IntegrationsSection,
  type IntegrationView,
} from "@/components/settings/IntegrationsSection";
import { ApiTokensSection, type TokenView } from "@/components/settings/ApiTokensSection";
import { AuditSection, type AuditEntry } from "@/components/settings/AuditSection";
import { DataExportSection } from "@/components/settings/DataExportSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";

export const metadata: Metadata = { title: "Settings" };

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  const authed = await requireUser();
  const [session, user] = await Promise.all([
    getSession(),
    prisma.user.findUnique({ where: { id: authed.id } }),
  ]);
  if (!user) {
    return null;
  }

  const role = authed.role;
  const canManageWorkspace = can(role, "settings.manage_workspace");
  const canAdmin = can(role, "admin.access");
  const canViewAudit = can(role, "audit.view");
  const canExportWorkspace =
    can(role, "report.view") && can(role, "project.view") && canManageWorkspace;

  const preferences = await getUserPreferences(user.id);

  // Active device sessions for the security section.
  const sessionRows = await prisma.userSession.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { lastActiveAt: "desc" },
  });
  const sessions: SessionRow[] = sessionRows.map((s) => {
    const ua = describeUserAgent(s.userAgent ?? "");
    return {
      id: s.id,
      deviceLabel: `${ua.browser} · ${ua.os}${s.ipLabel ? ` · ${s.ipLabel}` : ""}`,
      createdAt: s.createdAt.toISOString(),
      lastActiveAt: s.lastActiveAt.toISOString(),
      current: session?.sid === s.id,
    };
  });

  // Workspace-scoped data (only loaded when relevant).
  const workspace = canManageWorkspace ? await getWorkspaceSettings() : null;
  const integrationsRaw = canManageWorkspace ? await getIntegrations() : [];
  const integrations: IntegrationView[] = integrationsRaw.map((i) => ({
    key: i.key,
    name: i.name,
    description: i.description,
    status: i.status,
    accountLabel: i.accountLabel,
    connectedAt: i.connectedAt,
  }));

  const tokenRows = canAdmin
    ? await prisma.apiToken.findMany({
        where: { userId: user.id, revokedAt: null },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const tokens: TokenView[] = tokenRows.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: t.scopes,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt,
  }));

  const auditRows = canViewAudit
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { actor: { select: { name: true } } },
      })
    : [];
  const auditEntries: AuditEntry[] = auditRows.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    detail: a.detail,
    createdAt: a.createdAt,
    actorName: a.actor?.name ?? null,
  }));

  const workspaceActive = canManageWorkspace ? await isWorkspaceActive() : true;

  // Build the tab list + matching panels in identical order.
  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: "user", group: "Personal" },
    { id: "security", label: "Password", icon: "shield", group: "Personal" },
    { id: "mfa", label: "Two-factor", icon: "key", group: "Personal" },
    { id: "sessions", label: "Sessions", icon: "devices", group: "Personal" },
    { id: "notifications", label: "Notifications", icon: "bell", group: "Personal" },
    { id: "appearance", label: "Appearance", icon: "palette", group: "Personal" },
    { id: "localization", label: "Regional", icon: "globe", group: "Personal" },
    { id: "roles", label: "Roles & access", icon: "roles", group: "Workspace" },
  ];
  if (canManageWorkspace) {
    tabs.push({ id: "workspace", label: "Workspace", icon: "workspace", group: "Workspace" });
    tabs.push({
      id: "integrations",
      label: "Integrations",
      icon: "integrations",
      group: "Workspace",
    });
  }
  if (canAdmin) {
    tabs.push({ id: "tokens", label: "API tokens", icon: "terminal", group: "Workspace" });
  }
  if (canViewAudit) {
    tabs.push({ id: "audit", label: "Audit log", icon: "audit", group: "Workspace" });
  }
  tabs.push({ id: "data", label: "Data export", icon: "data", group: "Account" });
  if (canManageWorkspace || canAdmin) {
    tabs.push({ id: "danger", label: "Danger zone", icon: "danger", group: "Account" });
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, preferences, and workspace." />

      <SettingsShell tabs={tabs}>
        {/* Profile */}
        <SectionCard title="Profile" description="Your personal details and identity.">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={user.name} color={user.avatarColor} size={48} />
            <div className="min-w-0">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="muted" className="ml-auto">
              {ROLE_LABELS[role]}
            </Badge>
          </div>
          <ProfileForm
            defaultName={user.name}
            defaultTitle={user.title ?? ""}
            defaultDepartment={user.department ?? ""}
          />
        </SectionCard>

        {/* Password */}
        <SectionCard title="Password" description="Update the password used to sign in.">
          <ChangePasswordForm email={user.email} />
        </SectionCard>

        {/* MFA */}
        <SectionCard
          title="Two-factor authentication"
          description="Add a second step when signing in."
        >
          <MfaSection enabled={user.mfaEnabled} />
        </SectionCard>

        {/* Sessions */}
        <SectionCard
          title="Active sessions"
          description="Devices currently signed in to your account."
        >
          <SessionsSection sessions={sessions} />
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notifications" description="Choose what you are notified about.">
          <NotificationPrefsForm initial={preferences.notifications} />
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          title="Appearance & accessibility"
          description="Theme, density, and accessibility."
        >
          <AppearanceForm initial={preferences.appearance} />
        </SectionCard>

        {/* Localization */}
        <SectionCard title="Regional settings" description="Language, timezone, and formats.">
          <LocalizationForm initial={preferences.localization} />
        </SectionCard>

        {/* Roles (always visible) */}
        <SectionCard title="Roles & access control" description="How permissions map to roles.">
          <RolesMatrix />
        </SectionCard>

        {/* Workspace (admin) */}
        {canManageWorkspace ? (
          <SectionCard title="Workspace" description="Organization-wide configuration.">
            {workspace ? <WorkspaceSettingsForm workspace={workspace} /> : null}
          </SectionCard>
        ) : null}

        {/* Integrations (admin) */}
        {canManageWorkspace ? (
          <SectionCard title="Integrations" description="Connect external tools.">
            <IntegrationsSection integrations={integrations} canManage={canManageWorkspace} />
          </SectionCard>
        ) : null}

        {/* API tokens (admin) */}
        {canAdmin ? (
          <SectionCard title="API tokens" description="Programmatic access to the API.">
            <ApiTokensSection tokens={tokens} />
          </SectionCard>
        ) : null}

        {/* Audit log */}
        {canViewAudit ? (
          <SectionCard title="Audit log" description="Recent security & configuration events.">
            <AuditSection entries={auditEntries} />
          </SectionCard>
        ) : null}

        {/* Data export */}
        <SectionCard title="Data export" description="Download your data.">
          <DataExportSection canExportWorkspace={canExportWorkspace} />
        </SectionCard>

        {/* Danger zone */}
        {canManageWorkspace || canAdmin ? (
          <SectionCard title="Danger zone" description="Irreversible & high-impact actions.">
            <DangerZoneSection
              workspaceActive={workspaceActive}
              canManageWorkspace={canManageWorkspace}
              canResetData={canAdmin}
            />
          </SectionCard>
        ) : null}
      </SettingsShell>
    </div>
  );
}
