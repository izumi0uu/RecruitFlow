import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonClassMap = {
  default: {
    default: "btn-primary",
    sm: "btn-sm-primary",
    lg: "btn-lg-primary",
    icon: "btn-icon-primary",
  },
  secondary: {
    default: "btn-secondary",
    sm: "btn-sm-secondary",
    lg: "btn-lg-secondary",
    icon: "btn-icon-secondary",
  },
  outline: {
    default: "btn-outline",
    sm: "btn-sm-outline",
    lg: "btn-lg-outline",
    icon: "btn-icon-outline",
  },
  ghost: {
    default: "btn-ghost",
    sm: "btn-sm-ghost",
    lg: "btn-lg-ghost",
    icon: "btn-icon-ghost",
  },
  link: {
    default: "btn-link",
    sm: "btn-sm-link",
    lg: "btn-lg-link",
    icon: "btn-icon-link",
  },
  destructive: {
    default: "btn-destructive",
    sm: "btn-sm-destructive",
    lg: "btn-lg-destructive",
    icon: "btn-icon-destructive",
  },
} as const;

type ButtonVariant = keyof typeof buttonClassMap;
type ButtonSize = keyof (typeof buttonClassMap)["default"];

type ButtonVariantOptions = {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonVariants = ({
  className,
  variant = "default",
  size = "default",
}: ButtonVariantOptions = {}) => {
  return cn(buttonClassMap[variant][size], className);
};

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const Button = ({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <Comp
      data-slot="Button"
      className={
        buttonVariants({ className, variant, size }) + " cursor-pointer"
      }
      {...props}
    />
  );
};

export { Button, buttonVariants };
