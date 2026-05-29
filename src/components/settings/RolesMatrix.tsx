import { Check } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/domain/constants";
import { PERMISSIONS, permissionsFor, type Permission } from "@/lib/domain/permissions";
import { humanize } from "@/lib/utils";

/**
 * Read-only role/permission matrix. Renders the live RBAC model so admins can
 * audit exactly what each of the 8 roles can do. Source of truth is
 * {@link permissionsFor}, so the table can never drift from enforcement.
 */
export function RolesMatrix() {
  const granted = new Map(ROLES.map((r) => [r, new Set<Permission>(permissionsFor(r))]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Roles are fixed and enforced on every server action and route. This matrix is generated
        directly from the access-control model.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">
                Permission
              </th>
              {ROLES.map((role) => (
                <th key={role} className="px-2 py-2 text-center font-semibold whitespace-nowrap">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm} className="border-b border-border last:border-0">
                <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">
                  {humanize(perm.replace(".", " · "))}
                </td>
                {ROLES.map((role) => (
                  <td key={role} className="px-2 py-1.5 text-center">
                    {granted.get(role)?.has(perm) ? (
                      <Check className="mx-auto size-4 text-green-600" aria-label="granted" />
                    ) : (
                      <span className="text-muted-foreground/40" aria-label="not granted">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
