"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogIn, LogOut } from "lucide-react";
import useSWR, { mutate } from "swr";

import { BrandLockup } from "@/components/Brand";
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
import { signOut } from "@/app/(login)/actions";
import { useMounted } from "@/hooks/useMounted";
import { User } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getUserInitials = (user: Pick<User, "name" | "email">) => {
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
  const { data: user } = useSWR<User>("/api/user", fetcher);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    mutate("/api/user");
    router.push("/");
  };

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          Pricing
        </Link>
        <Button
          asChild
          variant="ghost"
          className="hidden rounded-full sm:inline-flex"
        >
          <Link href="/sign-in">
            <LogIn className="size-4" />
            Sign In
          </Link>
        </Button>
        <Button asChild className="rounded-full px-5">
          <Link href="/sign-up">Get Started</Link>
        </Button>
      </>
    );
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="rounded-full focus-visible:outline-none"
        aria-label="Open user menu"
      >
        <Avatar className="size-10">
          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
        </Avatar>
      </button>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
          aria-label="Open user menu"
        >
          <Avatar className="size-10 cursor-pointer">
            <AvatarImage alt={user.name || user.email || "RecruitFlow user"} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
        </button>
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
          <Link href="/dashboard" className="flex w-full items-center gap-2">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
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

const Header = () => {
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

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </section>
  );
};

export default Layout;
