import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell name={user.name} avatarUrl={user.avatarUrl ?? null} hasGeminiKey={user.hasGeminiKey}>
      {children}
    </AppShell>
  );
}
