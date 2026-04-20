import { redirect } from "next/navigation";

import { NoWorkspaceState } from "@/components/workspace/ModulePlaceholderPage";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/db/queries";

const WorkspaceRouteLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  if (!workspace) {
    return <NoWorkspaceState />;
  }

  return (
    <WorkspaceShell workspaceName={workspace.name}>{children}</WorkspaceShell>
  );
};

export default WorkspaceRouteLayout;
