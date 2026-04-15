"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Label = ({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => {
  return (
    <LabelPrimitive.Root
      data-slot="Label"
      className={cn(
        "label group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    />
  );
};

export { Label };
