"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { signOut } from "@/app/(login)/actions";
import { BrandLockup } from "@/components/Brand";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useMounted } from "@/hooks/useMounted";
import {
  currentUserQueryOptions,
  userQueryKey,
  workspaceQueryKey,
} from "@/lib/query/options";
import type { CurrentUserDto } from "@/lib/query/types";
import { startRouteLoading } from "@/lib/route-loading";

type UserIdentity = Pick<NonNullable<CurrentUserDto>, "name" | "email">;

const getUserInitials = (user: UserIdentity) => {
  const source = user.name?.trim() || user.email?.split("@")[0] || "RF";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
};

const UserMenu = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mounted = useMounted();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(currentUserQueryOptions());
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    queryClient.setQueryData(userQueryKey, null);
    queryClient.setQueryData(workspaceQueryKey, null);
    queryClient.removeQueries({ queryKey: userQueryKey, exact: true });
    queryClient.removeQueries({ queryKey: workspaceQueryKey, exact: true });
    startRouteLoading();
    router.push("/");
  };

  if (!user) {
    return (
      <>
        <TrackedLink
          href="/pricing"
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          Pricing
        </TrackedLink>
        <Button
          asChild
          variant="ghost"
          className="hidden rounded-full sm:inline-flex"
        >
          <TrackedLink href="/sign-in">
            <LogIn className="size-4" />
            Sign In
          </TrackedLink>
        </Button>
        <Button asChild className="rounded-full px-5">
          <TrackedLink href="/sign-up">Get Started</TrackedLink>
        </Button>
      </>
    );
  }

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:outline-none"
        aria-label="Open user menu"
      >
        <Avatar className="size-10">
          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
          aria-label="Open user menu"
        >
          <Avatar className="size-10 cursor-pointer">
            <AvatarImage alt={user.name || user.email || "RecruitFlow user"} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1 normal-case tracking-normal">
          <p className="text-sm font-medium text-foreground">
            {user.name || "RecruitFlow user"}
          </p>
          <p className="text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <TrackedLink
            href="/dashboard"
            className="flex w-full items-center gap-2"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </TrackedLink>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={async (event) => {
            event.preventDefault();
            await handleSignOut();
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PublicHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <BrandLockup />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 sm:gap-3">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="relative flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
    </section>
  );
};

export default PublicLayout;
