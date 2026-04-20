"use client";

import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";
import { type Theme } from "@/lib/theme";

import { useTheme } from "./ThemeProvider";

const themeOptions = [
  { value: "system" as const, label: "System", icon: LaptopMinimal },
  { value: "light" as const, label: "Light", icon: SunMedium },
  { value: "dark" as const, label: "Dark", icon: MoonStar },
];

type ThemeToggleProps = {
  className?: string;
};

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const ActiveIcon =
    !mounted || theme === "system"
      ? LaptopMinimal
      : resolvedTheme === "dark"
        ? MoonStar
        : SunMedium;

  const activeLabel =
    !mounted || theme === "system"
      ? `System${mounted ? ` · ${resolvedTheme}` : ""}`
      : theme === "dark"
        ? "Dark"
        : "Light";

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full border-border/70 bg-background/70 shadow-[0_24px_60px_-38px_var(--shadow-color)] backdrop-blur-xl",
          className,
        )}
        aria-label="Toggle theme"
      >
        <LaptopMinimal className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "cursor-pointer rounded-full border-border/70 bg-background/70 shadow-[0_24px_60px_-38px_var(--shadow-color)] backdrop-blur-xl",
            className,
          )}
          aria-label="Toggle theme"
        >
          <ActiveIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;

            return (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer gap-3"
              >
                <Icon className="size-4" />
                <span>{option.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2.5 pb-1 pt-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          {activeLabel}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeToggle };
