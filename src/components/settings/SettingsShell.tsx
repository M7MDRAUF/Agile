"use client";

import { useRef, useState, Children, isValidElement } from "react";
import {
  User,
  ShieldCheck,
  KeyRound,
  MonitorSmartphone,
  Bell,
  Palette,
  Globe,
  Building2,
  Users,
  Plug,
  Terminal,
  ScrollText,
  Download,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  user: User,
  shield: ShieldCheck,
  key: KeyRound,
  devices: MonitorSmartphone,
  bell: Bell,
  palette: Palette,
  globe: Globe,
  workspace: Building2,
  roles: Users,
  integrations: Plug,
  terminal: Terminal,
  audit: ScrollText,
  data: Download,
  danger: TriangleAlert,
};

export interface SettingsTab {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  group?: string;
}

/**
 * Enterprise settings shell: a left (vertical) sub-navigation on desktop that
 * collapses to a horizontal, scrollable strip on small screens. Panels are
 * server-rendered and passed as children in the same order as `tabs`.
 */
export function SettingsShell({
  tabs,
  children,
}: {
  tabs: SettingsTab[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const panels = Children.toArray(children).filter(isValidElement);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // BUG-M25 — WAI-ARIA tabs keyboard pattern: roving tabindex + arrow/Home/End
  // navigation that moves focus and activates the focused tab.
  const tabOrder = tabs.map((t) => t.id);
  function focusTab(id: string) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }
  function onTabKeyDown(e: React.KeyboardEvent, currentId: string) {
    const idx = tabOrder.indexOf(currentId);
    let nextId: string | undefined;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      nextId = tabOrder[(idx + 1) % tabOrder.length];
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      nextId = tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length];
    } else if (e.key === "Home") {
      nextId = tabOrder[0];
    } else if (e.key === "End") {
      nextId = tabOrder[tabOrder.length - 1];
    }
    if (nextId) {
      e.preventDefault();
      focusTab(nextId);
    }
  }

  // Group tabs for section headers in the nav.
  const groups: { group: string; items: SettingsTab[] }[] = [];
  for (const tab of tabs) {
    const key = tab.group ?? "General";
    const last = groups[groups.length - 1];
    if (last && last.group === key) last.items.push(tab);
    else groups.push({ group: key, items: [tab] });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav
        aria-label="Settings sections"
        className="lg:w-60 lg:shrink-0"
        role="tablist"
        aria-orientation="vertical"
      >
        <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
          {groups.map(({ group, items }) => (
            <div key={group} className="flex gap-1 lg:flex-col lg:gap-0.5">
              <p className="hidden px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
                {group}
              </p>
              {items.map((tab) => {
                const Icon = ICONS[tab.icon] ?? User;
                const selected = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    role="tab"
                    type="button"
                    id={`tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(tab.id)}
                    onKeyDown={(e) => onTabKeyDown(e, tab.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={active !== tab.id}
            className="space-y-6"
          >
            {panels[i]}
          </div>
        ))}
      </div>
    </div>
  );
}
