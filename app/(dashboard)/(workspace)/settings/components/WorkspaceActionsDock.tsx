"use client";

import {
  CreditCard,
  Ellipsis,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { InviteMemberForm } from "./InviteMemberForm";

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const WorkspaceActionsDock = ({ isOwner }: { isOwner: boolean }) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2 xl:items-end">
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-background/72 backdrop-blur-sm"
            >
              <Ellipsis className="size-4" />
              Quick actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Workspace actions</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!isOwner}
              onSelect={(event) => {
                event.preventDefault();
                setIsInviteDialogOpen(true);
              }}
            >
              <UserPlus className="size-4" />
              Invite member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                scrollToSection("settings-members");
              }}
            >
              <UsersRound className="size-4" />
              Jump to members
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                scrollToSection("settings-billing");
              }}
            >
              <CreditCard className="size-4" />
              Jump to billing
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <ShieldCheck className="size-4" />
              Role audit lives in member controls
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      {!isOwner ? (
        <p className="max-w-56 text-xs leading-5 text-muted-foreground xl:text-right">
          Only owners can send invitations. Members and billing sections remain
          available below for inspection.
        </p>
      ) : null}
    </div>
  );
};

export { WorkspaceActionsDock };
