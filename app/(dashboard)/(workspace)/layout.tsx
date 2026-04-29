import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { NoWorkspaceState } from "@/components/workspace/ModulePlaceholderPage";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
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
    const { workspace } = context;

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

    const dehydratedState = dehydrate(queryClient);

    return (
      <HydrationBoundary state={dehydratedState}>
        <WorkspaceShell workspaceName={workspace.name}>
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
