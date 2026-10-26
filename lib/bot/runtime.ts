import "server-only";
import { T } from "@/lib/tables";
import { hasBotToken, supabaseConfigured } from "@/lib/env";

/**
 * Long-running Discord gateway connection.
 *
 * Started from `instrumentation.ts` when the Node server boots and a bot token
 * is present. discord.js is imported lazily so builds and demo deployments
 * never load the gateway library at all.
 *
 * On serverless hosts that cannot keep a process alive, set
 * `BOT_DISABLED=1` and rely on:
 *   - Discord's HTTP interactions endpoint (or a separate worker)
 *   - /api/scheduler/tick for scheduled messages
 */

type Snapshot = {
  state: "idle" | "starting" | "ready" | "error" | "disabled";
  tag: string | null;
  latencyMs: number;
  guildCount: number;
  uptimeSeconds: number;
  error: string | null;
};

const globalKey = "__xDiscordBot";
type GlobalWithBot = typeof globalThis & {
  [globalKey]?: {
    snapshot: Snapshot;
    startedAt: number;
    stop: (() => Promise<void>) | null;
  };
};

function store() {
  const g = globalThis as GlobalWithBot;
  if (!g[globalKey]) {
    g[globalKey] = {
      snapshot: {
        state: "idle",
        tag: null,
        latencyMs: 0,
        guildCount: 0,
        uptimeSeconds: 0,
        error: null,
      },
      startedAt: Date.now(),
      stop: null,
    };
  }
  return g[globalKey]!;
}

async function persistStatus(patch: Partial<Snapshot>) {
  if (!supabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    await supabaseAdmin()
      .from(T.botStatus)
      .upsert(
        {
          id: "singleton",
          online: patch.state === "ready",
          latency_ms: patch.latencyMs ?? 0,
          uptime_seconds: patch.uptimeSeconds ?? 0,
          guild_count: patch.guildCount ?? 0,
          tag: patch.tag ?? "xDiscord",
          heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
  } catch {
    // status is best-effort telemetry; never crash the bot over it
  }
}

export function botRuntime() {
  return {
    snapshot(): Snapshot {
      const s = store();
      return {
        ...s.snapshot,
        uptimeSeconds: s.snapshot.state === "ready" ? Math.floor((Date.now() - s.startedAt) / 1000) : 0,
      };
    },
  };
}

export async function bootBot(): Promise<void> {
  const s = store();
  if (s.snapshot.state !== "idle") return;

  if (process.env.BOT_DISABLED === "1" || !hasBotToken) {
    s.snapshot.state = "disabled";
    s.snapshot.error = hasBotToken ? "disabled by BOT_DISABLED" : "DISCORD_BOT_TOKEN not set";
    return;
  }

  s.snapshot.state = "starting";
  s.startedAt = Date.now();

  try {
    const { Client, GatewayIntentBits, Events, ActivityType, MessageFlags } = await import(
      "discord.js"
    );
    const { tickScheduler } = await import("@/lib/scheduler");

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
      ],
    });

    client.once(Events.ClientReady, async (ready) => {
      s.snapshot = {
        state: "ready",
        tag: ready.user.tag,
        latencyMs: Math.round(ready.ws.ping),
        guildCount: ready.guilds.cache.size,
        uptimeSeconds: 0,
        error: null,
      };
      ready.user.setActivity("/help · x-Discord", { type: ActivityType.Watching });
      void persistStatus(s.snapshot);
      console.log(`[bot] ${ready.user.tag} connected to ${ready.guilds.cache.size} guilds`);

      // Hydrate the dashboard with real channels/commands for every guild.
      try {
        const { syncAllGuilds } = await import("@/lib/discord/provision");
        const result = await syncAllGuilds();
        console.log(`[bot] synced ${result.synced} guild(s)`);
      } catch (error) {
        console.error("[bot] guild sync failed", error);
      }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (!interaction.guildId) return;

      try {
        const { getRepo } = await import("@/lib/repo");
        const repo = getRepo ? await getRepo() : null;
        const bundle = repo ? await repo.getBundle(interaction.guildId) : null;
        const command = bundle?.commands.find(
          (c) => c.name === interaction.commandName && c.enabled,
        );

        if (!command) {
          await interaction.reply({
            content: "That command is disabled on this server.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (command.adminOnly && !interaction.memberPermissions?.has("ManageGuild")) {
          await interaction.reply({
            content: "You need **Manage Server** to run this one.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply({
          content: command.response || "Done.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        console.error("[bot] interaction failed", error);
        if (!interaction.replied) {
          await interaction
            .reply({ content: "Something went wrong running that command.", flags: MessageFlags.Ephemeral })
            .catch(() => {});
        }
      }
    });

    client.on(Events.GuildCreate, async (guild) => {
      try {
        const { provisionGuild, syncGuild } = await import("@/lib/discord/provision");
        await provisionGuild(guild.id);
        await syncGuild(guild.id);
        console.log(`[bot] joined ${guild.name} (${guild.id}) and synced`);
      } catch (error) {
        console.error("[bot] failed to sync newly joined guild", error);
      }
    });

    client.on(Events.Error, (error) => {
      console.error("[bot] gateway error", error);
      s.snapshot.error = error.message;
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
    s.stop = async () => {
      await client.destroy();
      s.snapshot.state = "idle";
    };

    // Keep latency telemetry fresh.
    setInterval(() => {
      if (s.snapshot.state !== "ready") return;
      s.snapshot.latencyMs = Math.round(client.ws.ping);
      s.snapshot.guildCount = client.guilds.cache.size;
      void persistStatus(s.snapshot);
    }, 60_000).unref?.();

    // Self-hosted deployments get a free scheduler loop; on serverless the
    // cron route takes over and this interval is harmless.
    setInterval(() => {
      void tickScheduler().catch((error) => console.error("[bot] scheduler tick failed", error));
    }, 30_000).unref?.();
  } catch (error) {
    s.snapshot.state = "error";
    s.snapshot.error = error instanceof Error ? error.message : "bot failed to start";
    console.error("[bot] failed to start", error);
  }
}

export async function shutdownBot() {
  const s = store();
  if (s.stop) await s.stop();
  s.stop = null;
}
