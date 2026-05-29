// Shared, non-server integration definitions. Kept out of the "use server"
// action module because those files may only export async functions.

export interface IntegrationDef {
  key: string;
  name: string;
  description: string;
}

// The set of integrations surfaced in Settings. Connection is local-dev
// simulated — no real OAuth handshake is performed.
export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "github",
    name: "GitHub",
    description: "Link pull requests and commits to work items.",
  },
  {
    key: "slack",
    name: "Slack / Teams",
    description: "Send sprint and blocker notifications to a channel.",
  },
  {
    key: "calendar",
    name: "Calendar",
    description: "Sync sprint ceremonies and due dates to your calendar.",
  },
  {
    key: "figma",
    name: "Figma",
    description: "Embed design files on work items and stories.",
  },
];
