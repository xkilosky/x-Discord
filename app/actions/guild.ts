"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { requireUser, DEMO_USER } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/env";
import { postChannelMessage, applyModeration, resolveMemberId } from "@/lib/discord/rest";
import type { AutomodRule, GuildSettings, ModActionType } from "@/lib/types";

type Result = { ok: boolean; message: string };

async function actor(): Promise<string> {
  if (DEMO_MODE) return DEMO_USER.username;
  const user = await requireUser();
  return user.username;
}

function refresh(guildId: string, section?: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${guildId}`);
  if (section) revalidatePath(`/dashboard/${guildId}/${section}`);
}

/* ------------------------------- messaging -------------------------------- */

export async function sendMessage(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const guildId = String(formData.get("guildId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "").trim();
  const embedOn = formData.get("embedOn") === "on";
  const embedTitle = String(formData.get("embedTitle") ?? "").trim();
  const embedBody = String(formData.get("embedBody") ?? "").trim();
  const embedColor = String(formData.get("embedColor") ?? "#7c5cff");

  if (!guildId || !channelId) return { ok: false, message: "Pick a server and channel first." };
  if (!content && !(embedOn && (embedTitle || embedBody))) {
    return { ok: false, message: "Write a message or fill in the embed." };
  }
  if (content.length > 2000) return { ok: false, message: "Discord caps messages at 2,000 characters." };

  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw).toISOString() : null;
  if (scheduledForRaw && Number.isNaN(new Date(scheduledForRaw).getTime())) {
    return { ok: false, message: "That send time isn't a valid date." };
  }
  if (scheduledFor && new Date(scheduledFor).getTime() < Date.now() - 60_000) {
    return { ok: false, message: "Pick a time in the future for scheduled messages." };
  }

  const embed = embedOn
    ? { title: embedTitle, description: embedBody, color: embedColor, footer: "x-Discord" }
    : null;

  const repo = await getRepo();
  const author = await actor();

  const record = await repo.createMessage({
    guildId,
    channelId,
    content,
    embed,
    scheduledFor,
    author,
  });

  if (!scheduledFor) {
    const result = await postChannelMessage({ channelId, content, embed });
    if (result.ok) {
      await repo.markMessage(record.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
        discordMessageId: result.messageId ?? null,
      });
    } else {
      await repo.markMessage(record.id, {
        status: "failed",
        error: result.error ?? "Delivery failed",
      });
      refresh(guildId, "messages");
      return { ok: false, message: result.error ?? "Discord refused the message." };
    }
  }

  refresh(guildId, "messages");
  return {
    ok: true,
    message: scheduledFor ? "Queued. It will post at the scheduled time." : "Delivered to the channel.",
  };
}

export async function cancelScheduledMessage(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const id = String(formData.get("id") ?? "");
  const guildId = String(formData.get("guildId") ?? "");
  await repo.markMessage(id, { status: "canceled" });
  refresh(guildId, "messages");
}

export async function deleteMessageRecord(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const id = String(formData.get("id") ?? "");
  const guildId = String(formData.get("guildId") ?? "");
  await repo.deleteMessage(id);
  refresh(guildId, "messages");
}

export async function retryMessage(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const id = String(formData.get("id") ?? "");
  const guildId = String(formData.get("guildId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const content = String(formData.get("content") ?? "");

  const result = await postChannelMessage({ channelId, content, embed: null });
  if (result.ok) {
    await repo.markMessage(id, { status: "sent", sentAt: new Date().toISOString(), error: undefined });
  } else {
    await repo.markMessage(id, { status: "failed", error: result.error ?? "Retry failed" });
  }
  refresh(guildId, "messages");
}

/* -------------------------------- automod --------------------------------- */

export async function toggleRule(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const guildId = String(formData.get("guildId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  await repo.updateRule(guildId, ruleId, { enabled });
  refresh(guildId, "automod");
}

export async function saveRule(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const guildId = String(formData.get("guildId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");

  const patch: Partial<AutomodRule> = {};
  const threshold = Number(formData.get("threshold"));
  if (Number.isFinite(threshold) && threshold > 0) patch.threshold = Math.round(threshold);

  const action = String(formData.get("action") ?? "");
  if (["delete", "warn", "timeout", "log"].includes(action)) {
    patch.action = action as AutomodRule["action"];
  }

  const timeoutMinutes = Number(formData.get("timeoutMinutes"));
  if (Number.isFinite(timeoutMinutes) && timeoutMinutes > 0) {
    patch.timeoutMinutes = Math.round(timeoutMinutes);
  }

  const terms = String(formData.get("terms") ?? "");
  if (formData.has("terms")) {
    patch.terms = terms
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  await repo.updateRule(guildId, ruleId, patch);
  refresh(guildId, "automod");
}

/* -------------------------------- commands -------------------------------- */

export async function saveCommand(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const guildId = String(formData.get("guildId") ?? "");
  const commandId = String(formData.get("commandId") ?? "");
  const response = String(formData.get("response") ?? "");
  const enabled = formData.get("enabled") === "on";
  const adminOnly = formData.get("adminOnly") === "on";

  await repo.updateCommand(guildId, commandId, {
    response: response.slice(0, 2000),
    enabled,
    adminOnly,
  });
  refresh(guildId, "commands");
}

export async function toggleCommand(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const guildId = String(formData.get("guildId") ?? "");
  const commandId = String(formData.get("commandId") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  await repo.updateCommand(guildId, commandId, { enabled });
  refresh(guildId, "commands");
}

/* ------------------------------- moderation ------------------------------- */

export async function applyModAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const guildId = String(formData.get("guildId") ?? "");
  const typeRaw = String(formData.get("type") ?? "warn");
  const targetName = String(formData.get("target") ?? "").trim().replace(/^@/, "");
  const reason = String(formData.get("reason") ?? "").trim();
  const minutes = Number(formData.get("minutes") ?? 10);

  if (!guildId) return { ok: false, message: "Unknown server." };
  if (!targetName) return { ok: false, message: "Enter the member's username or ID." };
  if (reason.length < 4) return { ok: false, message: "Add a short reason — future you will thank you." };

  const type = (["warn", "timeout", "kick", "ban", "unban"].includes(typeRaw)
    ? typeRaw
    : "warn") as ModActionType;

  const repo = await getRepo();
  const moderator = await actor();

  let duration: string | null = null;
  if (type === "timeout") {
    duration = `${Math.max(1, Math.round(minutes))}m`;
  }

  // In live mode a username has to become a snowflake before Discord will act
  // on it — destroying a member by guessed id is not acceptable.
  let targetId = /^\d{15,25}$/.test(targetName) ? targetName : `name:${targetName.toLowerCase()}`;
  let resolvedName = targetName;

  if (!DEMO_MODE) {
    const resolved = await resolveMemberId({ guildId, query: targetName });
    if (!resolved.ok || !resolved.userId) {
      if (type !== "warn") {
        return { ok: false, message: resolved.error ?? "Could not find that member." };
      }
    } else {
      targetId = resolved.userId;
      resolvedName = resolved.username ?? targetName;
    }
  }

  if (type !== "warn" && /^\d{15,25}$/.test(targetId)) {
    const result = await applyModeration({
      guildId,
      userId: targetId,
      type: type as "timeout" | "kick" | "ban" | "unban",
      minutes,
      reason,
    });
    if (!result.ok) return { ok: false, message: result.error ?? "Discord rejected the action." };
  }

  await repo.logModAction({
    guildId,
    type,
    targetId,
    targetName: resolvedName,
    moderator,
    reason,
    duration,
  });

  refresh(guildId, "moderation");
  return { ok: true, message: `${type} logged for ${targetName}.` };
}

/* -------------------------------- settings -------------------------------- */

export async function saveSettings(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const guildId = String(formData.get("guildId") ?? "");
  if (!guildId) return { ok: false, message: "Unknown server." };

  const patch: Partial<GuildSettings> = {
    logChannelId: String(formData.get("logChannelId") ?? "") || null,
    alertChannelId: String(formData.get("alertChannelId") ?? "") || null,
    timezone: String(formData.get("timezone") ?? "UTC"),
    automodDm: formData.get("automodDm") === "on",
    mentionAlertRole: String(formData.get("mentionAlertRole") ?? "") || null,
  };

  const repo = await getRepo();
  await repo.updateSettings(guildId, patch);
  refresh(guildId, "settings");
  return { ok: true, message: "Settings saved." };
}

export async function installBot(formData: FormData): Promise<void> {
  const repo = await getRepo();
  const guildId = String(formData.get("guildId") ?? "");
  await repo.installBot(guildId);
  refresh(guildId);
  redirect(`/dashboard/${guildId}`);
}

/* ------------------------------- scheduler -------------------------------- */

export async function runScheduler(): Promise<{ delivered: number; failed: number }> {
  const { tickScheduler } = await import("@/lib/scheduler");
  const result = await tickScheduler(new Date());

  for (const guildId of result.guildIds) {
    refresh(guildId, "messages");
  }

  return { delivered: result.delivered, failed: result.failed };
}

/* --------------------------- discord live sync ---------------------------- */

/**
 * Pull real channels, commands and membership from Discord into Postgres.
 * Authorization comes from the RLS-scoped read below: a user can only sync a
 * guild that already appears in their own guild list.
 */
export async function syncDiscordServer(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const guildId = String(formData.get("guildId") ?? "");
  if (!guildId) return { ok: false, message: "Unknown server." };

  const repo = await getRepo();
  const guild = await repo.getGuild(guildId);
  if (!guild) return { ok: false, message: "You don't have access to that server." };

  if (DEMO_MODE) {
    return {
      ok: false,
      message: "Demo mode — add DISCORD_BOT_TOKEN and Supabase keys to sync a real server.",
    };
  }

  const { syncGuild } = await import("@/lib/discord/provision");
  const result = await syncGuild(guildId);

  refresh(guildId);
  refresh(guildId, "messages");
  refresh(guildId, "automod");
  refresh(guildId, "commands");
  refresh(guildId, "settings");

  if (!result.ok) {
    return { ok: false, message: result.error ?? "Sync failed." };
  }

  return {
    ok: true,
    message: `Synced ${result.channels} channels and ${result.commands} commands from Discord.`,
  };
}
