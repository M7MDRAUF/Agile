// Shared, non-server constants for API token scopes. Kept out of the
// "use server" action module because those files may only export async
// functions.

export const TOKEN_SCOPES = [
  { value: "read", label: "Read (view projects, work items, reports)" },
  { value: "write", label: "Write (create & update work items)" },
  { value: "admin", label: "Admin (manage users & workspace)" },
] as const;

export type TokenScope = (typeof TOKEN_SCOPES)[number]["value"];
