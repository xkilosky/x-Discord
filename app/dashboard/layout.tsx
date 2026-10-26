import { AppShell } from "@/components/app-shell/shell";
import { loadShell } from "@/lib/data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, guilds, botStatus, demo, inviteUrl } = await loadShell();

  return (
    <AppShell user={user} guilds={guilds} botStatus={botStatus} demo={demo} inviteUrl={inviteUrl}>
      {children}
    </AppShell>
  );
}
