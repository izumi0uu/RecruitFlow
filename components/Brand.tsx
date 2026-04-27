import { TrackedLink } from "@/components/navigation/TrackedLink";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
  href?: string;
};

const BrandMark = ({ className }: BrandMarkProps) => {
  return (
    <span
      className={cn(
        "relative inline-flex size-11 items-center justify-center overflow-hidden rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,var(--panel),var(--surface-2))] text-foreground shadow-[0_26px_72px_-42px_var(--shadow-color)] before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[calc(1.35rem-1px)] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_46%)] before:opacity-80",
        className
      )}
    >
      <img
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        className="relative z-10 size-[72%] object-contain"
      />
    </span>
  );
};

const BrandLockup = ({
  className,
  compact = false,
  href = "/",
}: BrandLockupProps) => {
  const content = (
    <span className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "size-10 rounded-[1.15rem]" : undefined} />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[-0.02em] text-foreground sm:text-base">
          RecruitFlow
        </span>
        {!compact ? (
          <span className="mt-1 text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
            Recruiting workspace
          </span>
        ) : null}
      </span>
    </span>
  );

  return (
    <TrackedLink href={href} className="inline-flex items-center">
      {content}
    </TrackedLink>
  );
};

export { BrandLockup, BrandMark };
