"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/MobileNav";
import { type NavSection } from "@/components/layout/nav-config";
import { ROLE_LABELS, type Role } from "@/lib/domain/constants";
import { signOutAction } from "@/lib/auth/actions";

export function Topbar({
  user,
  unreadCount,
  sections,
}: {
  user: { name: string; email: string; role: Role; avatarColor?: string | null };
  unreadCount: number;
  sections: NavSection[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  // BUG-M24 — close the account menu on Escape and return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
      <MobileNav sections={sections} />
      <form onSubmit={onSearch} className="relative flex-1 max-w-md" role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, work items, people…"
          aria-label="Global search"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <Link
        href="/notifications"
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>

      <div className="relative">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar name={user.name} color={user.avatarColor} size={32} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </span>
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-1 shadow-lg text-foreground"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-sm px-3 py-2 text-sm hover:bg-muted"
              >
                Settings
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
