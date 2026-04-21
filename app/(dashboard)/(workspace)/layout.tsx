import { redirect } from "next/navigation";

import { NoWorkspaceState } from "@/components/workspace/ModulePlaceholderPage";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  isWorkspaceAccessError,
  requireWorkspace,
} from "@/lib/db/queries";

const WorkspaceRouteLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  try {
    const { workspace } = await requireWorkspace();

    return (
      <WorkspaceShell workspaceName={workspace.name}>{children}</WorkspaceShell>
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
