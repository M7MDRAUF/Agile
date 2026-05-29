"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("agileforge-theme");
    const initial = stored === "dark" ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function apply(next: "light" | "dark") {
    setTheme(next);
    localStorage.setItem("agileforge-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => apply("light")}
      >
        <Sun className="size-4" /> Light
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => apply("dark")}
      >
        <Moon className="size-4" /> Dark
      </Button>
    </div>
  );
}
