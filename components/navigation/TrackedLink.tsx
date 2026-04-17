"use client";

import Link, { useLinkStatus } from "next/link";
import { type ComponentProps, forwardRef, useEffect, useRef } from "react";

import { startRouteLoading, stopRouteLoading } from "@/lib/route-loading";

type TrackedLinkProps = ComponentProps<typeof Link>;

const TrackedLinkStatusBridge = () => {
  const { pending } = useLinkStatus();
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending && !wasPendingRef.current) {
      wasPendingRef.current = true;
      startRouteLoading();
      return;
    }

    if (!pending && wasPendingRef.current) {
      wasPendingRef.current = false;
      stopRouteLoading();
    }
  }, [pending]);

  return null;
};

const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  ({ children, ...props }, ref) => {
    return (
      <Link ref={ref} {...props}>
        <TrackedLinkStatusBridge />
        {children}
      </Link>
    );
  },
);

TrackedLink.displayName = "TrackedLink";

export { TrackedLink };
