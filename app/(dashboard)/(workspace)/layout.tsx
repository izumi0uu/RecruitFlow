import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { NoWorkspaceState } from "@/components/workspace/ModulePlaceholderPage";
import { WorkspaceContextRail } from "@/components/workspace/WorkspaceContextRail";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  getDashboardActivityDigest,
  getDashboardKpis,
} from "@/lib/dashboard/queries";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
} from "@/lib/query/options";
import { createQueryClient } from "@/lib/query/query-client";
import { toQueryDto } from "@/lib/query/types";
import {
  getCurrentUser,
  getCurrentWorkspace,
  isWorkspaceAccessError,
  requireWorkspace,
} from "@/lib/db/queries";

const WorkspaceRouteLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  try {
    const context = await requireWorkspace();
    const queryClient = createQueryClient();
    const { membership, user, workspace } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        ...currentUserQueryOptions(),
        queryFn: async () => toQueryDto(await getCurrentUser()),
      }),
      queryClient.prefetchQuery({
        ...currentWorkspaceQueryOptions(),
        queryFn: async () => toQueryDto(await getCurrentWorkspace()),
      }),
    ]);

    const [kpisResult, activityResult] = await Promise.allSettled([
      getDashboardKpis(workspace.id),
      getDashboardActivityDigest(workspace.id, 4),
    ]);
    const dehydratedState = dehydrate(queryClient);
    const railKpis = kpisResult.status === "fulfilled" ? kpisResult.value : null;
    const railActivity =
      activityResult.status === "fulfilled" ? activityResult.value : [];

    return (
      <HydrationBoundary state={dehydratedState}>
        <WorkspaceShell
          workspaceName={workspace.name}
          contextPanel={
            <WorkspaceContextRail
              activity={railActivity}
              email={user.email}
              kpis={railKpis}
              name={user.name}
              role={membership.role}
              workspaceName={workspace.name}
            />
          }
        >
          {children}
        </WorkspaceShell>
      </HydrationBoundary>
    );
  } catch (error) {
    if (isWorkspaceAccessError(error)) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/sign-in");
      }

      if (error.code === "NO_WORKSPACE") {
        return <NoWorkspaceState />;
      }
    }

    throw error;
  }
};

export default WorkspaceRouteLayout;
