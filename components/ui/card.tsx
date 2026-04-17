import * as React from "react";

import { cn } from "@/lib/utils";

const Card = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="Card" className={cn("card", className)} {...props} />;
};

const CardHeader = ({
  className,
  ...props
}: React.ComponentProps<"header">) => {
  return (
    <header
      data-slot="CardHeader"
      className={cn("has-data-[slot=CardAction]:grid-cols-[1fr_auto]", className)}
      {...props}
    />
  );
};

const CardTitle = ({ className, ...props }: React.ComponentProps<"h3">) => {
  return (
    <h3
      data-slot="CardTitle"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
};

const CardDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return (
    <p
      data-slot="CardDescription"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
};

const CardAction = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="CardAction"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
};

const CardContent = ({
  className,
  ...props
}: React.ComponentProps<"section">) => {
  return <section data-slot="CardContent" className={className} {...props} />;
};

const CardFooter = ({
  className,
  ...props
}: React.ComponentProps<"footer">) => {
  return <footer data-slot="CardFooter" className={className} {...props} />;
};

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
