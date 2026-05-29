"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/domain/user-settings";

/**
 * Resolves the "system" theme on the client. Explicit light/dark themes are
 * already applied server-side via the shell class, so this only needs to react
 * to the OS preference when the user chose "system".
 */
export function AppearanceApplier({ theme }: { theme: Theme }) {
  useEffect(() => {
    const shell = document.getElementById("app-shell");
    if (!shell) return;
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => shell.classList.toggle("dark", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return null;
}
