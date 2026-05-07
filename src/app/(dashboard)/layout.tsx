import { redirect } from "next/navigation";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { Layout } from "../components/Layout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getRequestActor();
  if (!actor) {
    redirect("/sign-in");
  }

  return (
    <Layout canManageAdmin={canManageUsers(actor)} baseRole={actor.baseRole} persona={actor.persona}>
      {children}
    </Layout>
  );
}
