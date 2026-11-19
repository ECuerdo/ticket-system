"use client";

import { useTheme } from "@/components/shared/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleButtonProps {
  showLabel?: boolean;
  className?: string;
  size?: "default" | "sm" | "xs" | "icon" | "icon-sm" | "lg";
  variant?: "outline" | "ghost" | "default" | "secondary";
}

export function ThemeToggleButton({
  showLabel = true,
  className = "",
  size = "sm",
  variant = "outline",
}: ThemeToggleButtonProps) {
  const { isDark, toggleTheme } = useTheme();

  // Dynamically switches name, icon, and function based on the current active mode
  const targetModeName = isDark ? "Light Mode" : "Dark Mode";
  const TargetIcon = isDark ? Sun : Moon;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`cursor-pointer transition-all gap-1.5 ${className}`}
      title={`Switch to ${targetModeName}`}
      aria-label={`Switch to ${targetModeName}`}
    >
      <TargetIcon
        className={`size-3.5 shrink-0 transition-transform duration-300 ${
          isDark
            ? "text-amber-500 hover:rotate-45"
            : "text-indigo-500 dark:text-indigo-400 hover:-rotate-12"
        }`}
      />
      {showLabel && (
        <span className="text-xs font-medium select-none">
          {targetModeName}
        </span>
      )}
    </Button>
  );
}
