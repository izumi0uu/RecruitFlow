import { BrandLockup } from "@/components/Brand";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="panel-shell w-full max-w-xl rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center space-y-6">
          <BrandLockup compact />
          <span className="inline-kicker">404</span>
          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-foreground">
              The page drifted out of this workspace.
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              It may have moved, expired, or never existed. The rest of the
              product is still right where you left it.
            </p>
          </div>
          <Button asChild className="rounded-full px-6">
            <TrackedLink href="/">Back to home</TrackedLink>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
