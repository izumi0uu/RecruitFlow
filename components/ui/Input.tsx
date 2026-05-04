import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  leadingIcon?: React.ReactNode;
  leadingIconClassName?: string;
  wrapperClassName?: string;
};

const Input = ({
  className,
  leadingIcon,
  leadingIconClassName,
  type = "text",
  wrapperClassName,
  ...props
}: InputProps) => {
  const control = (
    <input
      type={type}
      data-slot="Input"
      className={cn(
        "input",
        leadingIcon && "input--with-leading-icon",
        className,
      )}
      {...props}
    />
  );

  if (!leadingIcon) {
    return control;
  }

  return (
    <span
      className={cn("relative block", wrapperClassName)}
      data-slot="InputWrapper"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground",
          leadingIconClassName,
        )}
      >
        {leadingIcon}
      </span>
      {control}
    </span>
  );
};

export { Input };
