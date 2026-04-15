import * as React from "react";

import { cn } from "@/lib/utils";

const Input = ({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) => {
  return (
    <input
      type={type}
      data-slot="Input"
      className={cn("input", className)}
      {...props}
    />
  );
};

export { Input };
