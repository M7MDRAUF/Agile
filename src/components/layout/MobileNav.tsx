"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon, Menu, X } from "lucide-react";
import { type NavSection } from "./nav-config";
import { NAV_ICONS } from "./nav-icons";

/**
 * BUG-H10 — mobile navigation. The desktop <Sidebar/> is hidden below `md`, so
 * on small screens (≤768px, incl. 375px) this hamburger opens an accessible
 * drawer with the same permission-filtered nav. The drawer:
 *  - is a modal dialog (role="dialog" aria-modal) with a labelled backdrop,
 *  - closes on Escape, backdrop click, or navigation,
 *  - returns focus to the trigger on close,
 *  - locks body scroll while open.
 */
export function MobileNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close and return focus to the trigger (Escape / backdrop / close button /
  // navigation all route through here so focus management stays in one place).
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // While open: focus the close button, wire Escape, and lock body scroll.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open navigation menu"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close navigation menu"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-black/50"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-white">
              <span className="flex items-center gap-2">
                <Hexagon className="size-6 shrink-0 text-primary" />
                <span className="text-lg font-bold">AgileForge</span>
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close navigation menu"
                className="inline-flex size-9 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Primary">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/75">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = NAV_ICONS[item.icon];
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpen(false)}
                            className={
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                              (active
                                ? "bg-primary text-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white")
                            }
                          >
                            <Icon className="size-4 shrink-0" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
