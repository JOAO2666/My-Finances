"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkCurrent = document.documentElement.classList.contains("dark");
    setIsDark(isDarkCurrent);
  }, []);

  function toggle() {
    triggerHaptic("pop");
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  if (!mounted) {
    return (
      <div className={`size-8 rounded-lg ${className}`} aria-hidden="true" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`group relative flex items-center gap-2 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 active:scale-90 transition-all ${className}`}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label="Alternar modo escuro"
    >
      <span className="grid size-5 place-items-center transition-transform duration-300 group-hover:rotate-45">
        {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600 dark:text-slate-300" />}
      </span>
      <span className="text-xs font-medium lg:inline sm:hidden hidden">
        {isDark ? "Modo Claro" : "Modo Escuro"}
      </span>
    </button>
  );
}
