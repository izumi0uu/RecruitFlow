import { redirect } from "next/navigation";

const LegacyDashboardActivityPage = () => {
  redirect("/settings/activity");
};

export default LegacyDashboardActivityPage;
