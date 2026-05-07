import { getRequestActor } from "@/lib/auth";
import { StudentPortfolios } from "../../components/StudentPortfolios";

export default async function StudentPortfoliosPage() {
  const actor = await getRequestActor();
  const canManageStudents = actor?.role === "admin" || actor?.role === "teacher";

  return <StudentPortfolios canManageStudents={canManageStudents} />;
}
