import { redirect } from "next/navigation";

const LegacyDashboardGeneralPage = () => {
  redirect("/settings/general");
};

export default LegacyDashboardGeneralPage;
