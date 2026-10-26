import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/repo";
import { DEMO_MODE, botInviteUrl } from "@/lib/env";
import type { BotStatus, Guild, GuildBundle, SessionUser } from "@/lib/types";

export type ShellData = {
  user: SessionUser;
  guilds: Guild[];
  botStatus: BotStatus;
  demo: boolean;
  inviteUrl: string;
};

export async function loadShell(): Promise<ShellData> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const repo = await getRepo();
  const [guilds, botStatus] = await Promise.all([repo.listGuilds(), repo.botStatus()]);

  return { user, guilds, botStatus, demo: DEMO_MODE, inviteUrl: botInviteUrl() };
}

export async function loadGuildBundle(guildId: string): Promise<GuildBundle> {
  const repo = await getRepo();
  const bundle = await repo.getBundle(guildId);
  if (!bundle) redirect("/dashboard?missing=1");
  return bundle;
}

export async function loadGuilds(): Promise<Guild[]> {
  const repo = await getRepo();
  return repo.listGuilds();
}
