import { redirect } from "next/navigation";

const LegacyDashboardSecurityPage = () => {
  redirect("/settings/security");
};

export default LegacyDashboardSecurityPage;
