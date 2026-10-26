import "server-only";
import { cookies } from "next/headers";
import { demo } from "@/lib/demo/store";
import { DEMO_MODE } from "@/lib/env";
import { supabaseRepo } from "@/lib/supabase/repo";
import type {
  ActivityItem,
  AutomodRule,
  BotStatus,
  Channel,
  CommandConfig,
  Guild,
  GuildBundle,
  GuildSettings,
  MessageRecord,
  ModAction,
} from "@/lib/types";

/**
 * Storage contract shared by the demo dataset and Supabase.
 * Every page/action talks to this interface, never to a database directly.
 */
export interface Repo {
  mode: "demo" | "live";
  listGuilds(): Promise<Guild[]>;
  getGuild(id: string): Promise<Guild | null>;
  listChannels(guildId: string): Promise<Channel[]>;
  getBundle(guildId: string): Promise<GuildBundle | null>;
  createMessage(input: {
    guildId: string;
    channelId: string;
    content: string;
    embed: MessageRecord["embed"];
    scheduledFor: string | null;
    author: string;
  }): Promise<MessageRecord>;
  listDueMessages(now?: Date): Promise<MessageRecord[]>;
  markMessage(
    id: string,
    patch: Partial<MessageRecord> & { discordMessageId?: string | null },
  ): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  updateRule(guildId: string, ruleId: string, patch: Partial<AutomodRule>): Promise<void>;
  updateCommand(guildId: string, commandId: string, patch: Partial<CommandConfig>): Promise<void>;
  logModAction(input: Omit<ModAction, "id" | "createdAt">): Promise<ModAction>;
  updateSettings(guildId: string, patch: Partial<GuildSettings>): Promise<void>;
  installBot(guildId: string): Promise<void>;
  botStatus(): Promise<BotStatus>;
  recentActivity(guildId: string, limit?: number): Promise<ActivityItem[]>;
}

const demoRepo: Repo = {
  mode: "demo",
  async listGuilds() {
    return demo.listGuilds();
  },
  async getGuild(id) {
    return demo.getGuild(id);
  },
  async listChannels(guildId) {
    return demo.listChannels(guildId);
  },
  async getBundle(guildId) {
    return demo.getBundle(guildId);
  },
  async createMessage(input) {
    return demo.createMessage(input);
  },
  async listDueMessages(now = new Date()) {
    return demo.listDue(now);
  },
  async markMessage(id, patch) {
    demo.updateMessage(id, patch);
  },
  async deleteMessage(id) {
    demo.deleteMessage(id);
  },
  async updateRule(guildId, ruleId, patch) {
    demo.updateRule(guildId, ruleId, patch);
  },
  async updateCommand(guildId, commandId, patch) {
    demo.updateCommand(guildId, commandId, patch);
  },
  async logModAction(input) {
    return demo.logModAction(input);
  },
  async updateSettings(guildId, patch) {
    demo.updateSettings(guildId, patch);
  },
  async installBot(guildId) {
    demo.installBot(guildId);
  },
  async botStatus() {
    return demo.botStatus();
  },
  async recentActivity(guildId, limit) {
    return demo.recentActivity(guildId, limit);
  },
};

/** Cookie that pins a session to the demo dataset on a live deployment. */
export const MODE_COOKIE = "xd_mode";

export async function demoActive(): Promise<boolean> {
  if (DEMO_MODE) return true;
  try {
    const store = await cookies();
    return store.get(MODE_COOKIE)?.value === "demo";
  } catch {
    return false;
  }
}

/**
 * Storage handle for the current request. Demo mode is the default when no
 * credentials exist, and stays reachable on a live deployment so the product
 * can still be explored before real Discord credentials are wired up.
 */
export async function getRepo(): Promise<Repo> {
  return (await demoActive()) ? demoRepo : supabaseRepo;
}
