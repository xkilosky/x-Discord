import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { provisionGuild } from "@/lib/discord/provision";

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  approximate_member_count?: number;
};

const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

function roleFor(guild: DiscordGuild): "owner" | "admin" | "moderator" {
  if (guild.owner) return "owner";
  const perms = BigInt(guild.permissions);
  if ((perms & ADMINISTRATOR) !== 0n) return "admin";
  if ((perms & MANAGE_GUILD) !== 0n) return "admin";
  return "moderator";
}

const ACCENTS = ["#7c5cff", "#22d3ee", "#3ddc97", "#f5b544", "#ff5d6c", "#f472b6"];

/**
 * Mirrors the servers a user can manage into Postgres, using the OAuth
 * `guilds` scope token captured at sign-in.
 *
 * Only servers where the user has Manage Server / Administrator (or owns) are
 * inserted — the dashboard can never show a server you can't act on.
 */
export async function syncUserGuilds(userId: string, providerToken: string | null) {
  if (!providerToken) return { synced: 0, skipped: "no provider token" };

  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return { synced: 0, skipped: `discord responded ${res.status}` };
  }

  const all = (await res.json()) as DiscordGuild[];
  const manageable = all.filter((g) => {
    if (g.owner) return true;
    const perms = BigInt(g.permissions);
    return (perms & MANAGE_GUILD) !== 0n || (perms & ADMINISTRATOR) !== 0n;
  });

  if (manageable.length === 0) return { synced: 0, skipped: "no manageable servers" };

  const admin = supabaseAdmin();

  const guildRows = manageable.map((g, i) => ({
    id: g.id,
    name: g.name,
    initials: g.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
    icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
    accent: ACCENTS[i % ACCENTS.length],
    member_count: g.approximate_member_count ?? 0,
    owner_discord_id: g.owner ? null : undefined,
    viewer_role: roleFor(g),
  }));

  await admin.from("guilds").upsert(guildRows, { onConflict: "id" });

  await admin.from("guild_members").upsert(
    manageable.map((g) => ({ guild_id: g.id, user_id: userId, role: roleFor(g) })),
    { onConflict: "guild_id,user_id" },
  );

  // Give every new guild a usable dashboard immediately: default AutoMod
  // rules, slash commands and a settings row. Idempotent on re-login.
  const provisioned: string[] = [];
  for (const g of manageable) {
    const result = await provisionGuild(g.id);
    if (result.errors.length === 0) provisioned.push(g.id);
  }

  return { synced: manageable.length, provisioned: provisioned.length, baseUrl: serverEnv.appUrl };
}
