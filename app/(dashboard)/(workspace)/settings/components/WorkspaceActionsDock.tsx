"use client";

import { forwardRef } from "react";
import { CreditCard, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

import { InviteMemberForm } from "./InviteMemberForm";

const compactActionTextVariants = {
  rest: {
    opacity: 0,
    width: 0,
  },
  reveal: {
    opacity: 1,
    width: "auto",
  },
};

const compactActionTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
} as const;

type CompactWorkspaceActionProps = HTMLMotionProps<"button"> & {
  icon: LucideIcon;
  title: string;
};

const CompactWorkspaceAction = forwardRef<
  HTMLButtonElement,
  CompactWorkspaceActionProps
>(
  (
    { className, disabled, icon: Icon, title, type = "button", ...props },
    ref,
  ) => (
    <motion.button
      ref={ref}
      type={type}
      aria-label={title}
      disabled={disabled}
      initial="rest"
      whileHover={disabled ? "rest" : "reveal"}
      whileFocus={disabled ? "rest" : "reveal"}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      layout
      transition={compactActionTransition}
      className={cn(
        "group/action inline-flex h-12 min-w-12 max-w-full cursor-pointer items-center overflow-hidden rounded-[1.05rem] border border-border/70 bg-background/72 px-2.5 text-left text-foreground shadow-[0_16px_42px_-34px_var(--shadow-color)] backdrop-blur-sm transition-colors hover:border-foreground/15 hover:bg-surface-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-surface-2/70 text-foreground transition-colors group-hover/action:bg-foreground group-hover/action:text-background">
        <Icon className="size-4" />
      </span>
      <motion.span
        variants={compactActionTextVariants}
        transition={compactActionTransition}
        className="min-w-0 overflow-hidden whitespace-nowrap"
      >
        <span className="ml-3 block text-sm font-semibold leading-none">
          {title}
        </span>
      </motion.span>
    </motion.button>
  ),
);

CompactWorkspaceAction.displayName = "CompactWorkspaceAction";

const CompactWorkspaceActionMarker = ({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) => (
  <motion.div
    aria-disabled="true"
    role="img"
    aria-label={title}
    initial="rest"
    whileHover="reveal"
    whileFocus="reveal"
    layout
    transition={compactActionTransition}
    tabIndex={0}
    className="group/action inline-flex h-12 min-w-12 max-w-full cursor-pointer items-center overflow-hidden rounded-[1.05rem] border border-dashed border-border/70 bg-surface-1/48 px-2.5 text-left text-muted-foreground transition-colors hover:border-border hover:bg-surface-1/75 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
  >
    <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-background/70 text-muted-foreground">
      <Icon className="size-4" />
    </span>
    <motion.span
      variants={compactActionTextVariants}
      transition={compactActionTransition}
      className="min-w-0 overflow-hidden whitespace-nowrap"
    >
      <span className="ml-3 block text-sm font-semibold leading-none text-foreground">
        {title}
      </span>
    </motion.span>
  </motion.div>
);

const WorkspaceActionsDock = ({ isOwner }: { isOwner: boolean }) => (
  <div className="flex flex-col items-start gap-2 xl:items-end">
    <div className="flex min-h-12 flex-wrap items-center gap-2 xl:justify-end">
      <Dialog>
        <DialogTrigger asChild>
          <CompactWorkspaceAction
            disabled={!isOwner}
            icon={UsersRound}
            title="Invite member"
          />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Add another member when the workspace is ready for more hands.
            </DialogDescription>
          </DialogHeader>
          <InviteMemberForm isOwner={isOwner} />
        </DialogContent>
      </Dialog>

      <CompactWorkspaceActionMarker icon={ShieldCheck} title="Role audit" />
      <CompactWorkspaceActionMarker icon={CreditCard} title="Billing handoff" />
    </div>

    {!isOwner ? (
      <p className="max-w-56 text-xs leading-5 text-muted-foreground xl:text-right">
        Only owners can use invitation actions.
      </p>
    ) : null}
  </div>
);

export { WorkspaceActionsDock };
