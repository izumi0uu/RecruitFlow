import {
  Activity,
  CheckCircle,
  Lock,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getActivityLogs } from "@/lib/db/queries";
import { ActivityType } from "@/lib/db/schema";

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";

  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;

  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;

  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
};

const formatAction = (action: ActivityType): string => {
  switch (action) {
    case ActivityType.SIGN_UP:
      return "You signed up";
    case ActivityType.SIGN_IN:
      return "You signed in";
    case ActivityType.SIGN_OUT:
      return "You signed out";
    case ActivityType.UPDATE_PASSWORD:
      return "You changed your password";
    case ActivityType.DELETE_ACCOUNT:
      return "You deleted your account";
    case ActivityType.UPDATE_ACCOUNT:
      return "You updated your account";
    case ActivityType.CREATE_TEAM:
      return "You created a new workspace";
    case ActivityType.REMOVE_TEAM_MEMBER:
      return "You removed a workspace member";
    case ActivityType.INVITE_TEAM_MEMBER:
      return "You invited a workspace member";
    case ActivityType.ACCEPT_INVITATION:
      return "You accepted an invitation";
    default:
      return "Unknown action occurred";
  }
};

const ActivityPage = async () => {
  const logs = await getActivityLogs();

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <div className="space-y-3">
        <span className="inline-kicker">Workspace history</span>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          Activity log
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review recent account and workspace actions in the same subdued
          surface as the rest of the product.
        </p>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            The last few actions recorded for this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-3">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || ShieldCheck;
                const formattedAction = formatAction(
                  log.action as ActivityType,
                );

                return (
                  <li
                    key={log.id}
                    className="flex gap-4 rounded-[1.5rem] border border-border/70 bg-surface-1/75 px-4 py-4"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-border/70 bg-background/75">
                      <Icon className="size-[1.125rem] text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress ? ` from IP ${log.ipAddress}` : ""}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {getRelativeTime(new Date(log.timestamp))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-surface-1/55 px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/70">
                <Activity className="size-5 text-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">
                No activity yet
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                When you sign in, update your account, or manage workspace
                members, the activity will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default ActivityPage;
