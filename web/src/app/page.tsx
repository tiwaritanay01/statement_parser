import { requireAuth } from "@/lib/auth";
import TransactionDashboard from "@/components/TransactionDashboard";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <main className="min-h-screen bg-zinc-950">
      <TransactionDashboard user={user} />
    </main>
  );
}
