"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  className?: string;
  variant?: "default" | "secondary" | "outline";
};

export const SubmitButton = ({
  className,
  variant = "default",
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      className={cn("cursor-pointer w-full rounded-full", className)}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          Get Started
          <ArrowRight className="size-4" />
        </>
      )}
    </Button>
  );
};
