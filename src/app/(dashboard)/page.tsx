import { getRequestActor } from "@/lib/auth";
import { Dashboard } from "../components/Dashboard";
import { StudentPortfolios } from "../components/StudentPortfolios";

export default async function HomePage() {
  const actor = await getRequestActor();
  const effectiveRole = actor ? (actor.baseRole === "admin" && actor.persona === "teacher" ? "teacher" : actor.baseRole) : "teacher";

  if (effectiveRole === "teacher") {
    const canManageStudents = true; // teachers can manage
    return <StudentPortfolios canManageStudents={canManageStudents} />;
  }

  return <Dashboard />;
}
