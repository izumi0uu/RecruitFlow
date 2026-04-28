"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = (
  props: React.ComponentProps<typeof DialogPrimitive.Root>
) => {
  return <DialogPrimitive.Root data-slot="Dialog" {...props} />;
};

const DialogTrigger = (
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) => {
  return <DialogPrimitive.Trigger data-slot="DialogTrigger" {...props} />;
};

const DialogPortal = (
  props: React.ComponentProps<typeof DialogPrimitive.Portal>
) => {
  return <DialogPrimitive.Portal data-slot="DialogPortal" {...props} />;
};

const DialogClose = (
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) => {
  return <DialogPrimitive.Close data-slot="DialogClose" {...props} />;
};

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => {
  return (
    <DialogPrimitive.Overlay
      data-slot="DialogOverlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/35 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
};

const DialogContent = ({
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="DialogContent"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[min(88dvh,52rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-[2rem] border border-border/70 bg-popover/94 p-6 text-popover-foreground shadow-[0_40px_120px_-58px_var(--shadow-color)] backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-7",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground shadow-[0_16px_36px_-28px_var(--shadow-color)] transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

const DialogHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="DialogHeader"
      className={cn("space-y-2 pr-10", className)}
      {...props}
    />
  );
};

const DialogTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => {
  return (
    <DialogPrimitive.Title
      data-slot="DialogTitle"
      className={cn(
        "text-2xl font-semibold tracking-[-0.05em] text-foreground",
        className,
      )}
      {...props}
    />
  );
};

const DialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => {
  return (
    <DialogPrimitive.Description
      data-slot="DialogDescription"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
};

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
